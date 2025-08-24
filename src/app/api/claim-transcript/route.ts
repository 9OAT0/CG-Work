// app/api/claim-transcript/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@/generated/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET!;
const TRANSCRIPT_COST = 6;

function getBangkokDay() {
  const th = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  const dayKey = `${y}-${m}-${d}`;
  return {
    dayKey,
    startUtc: new Date(`${dayKey}T00:00:00.000+07:00`),
    endUtc: new Date(`${dayKey}T23:59:59.999+07:00`),
  };
}

async function withTxRetry<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  max = 5
): Promise<T> {
  let i = 0;
  while (true) {
    try {
      return await prisma.$transaction((tx) => fn(tx));
    } catch (e: any) {
      const conflict =
        e?.code === "P2034" ||
        /write conflict|deadlock/i.test(e?.message || "");
      if (conflict && ++i < max) {
        await new Promise((r) => setTimeout(r, 100 * i));
        continue;
      }
      throw e;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: { id: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = payload.id;
    const { startUtc, endUtc, dayKey } = getBangkokDay();

    const result = await withTxRetry(async (tx) => {
      // กันเคลมซ้ำวันนี้
      const already = await tx.transcriptLog.findFirst({
        where: { userId, date: { gte: startUtc, lt: endUtc } },
        select: { id: true },
      });
      if (already) {
        return {
          ok: false as const,
          code: 400,
          msg: "คุณรับ transcript วันนี้แล้ว",
        };
      }

      // แต้มรายวันวันนี้ (join + adjustments)
      const [joinsToday, adjSum] = await Promise.all([
        tx.boothJoin.count({
          where: { userId, joinedAt: { gte: startUtc, lt: endUtc } },
        }),
        tx.pointAdjustment.aggregate({
          _sum: { amount: true },
          where: { userId, appliedAt: { gte: startUtc, lt: endUtc } },
        }),
      ]);
      const todaysPoints = joinsToday + (adjSum._sum.amount ?? 0);

      if (todaysPoints < TRANSCRIPT_COST) {
        return { ok: false as const, code: 400, msg: "คะแนนรายวันไม่เพียงพอ" };
      }

      // บันทึก Log (แนะนำมี unique ที่ (userId, dayKey) เพื่อกัน race)
      try {
        await tx.transcriptLog.create({
          data: { userId, date: new Date(), dayKey }, // ต้องมี field dayKey ใน schema ด้วยถ้าใช้บรรทัดนี้
        });
      } catch (e: any) {
        if (e?.code === "P2002") {
          return {
            ok: false as const,
            code: 400,
            msg: "คุณรับ transcript วันนี้แล้ว",
          };
        }
        throw e;
      }

      // 1) หัก "แต้มรายวัน" ด้วย PointAdjustment = -6
      await tx.pointAdjustment.create({
        data: {
          userId,
          amount: -TRANSCRIPT_COST,
          reason: "CLAIM_TRANSCRIPT",
          appliedAt: new Date(),
        },
      });

      // 2) หัก "score (แต้มสะสม)" ให้เชื่อมกับ dailyPoints ด้วยจำนวนเดียวกัน และไม่ให้ติดลบ
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { score: true },
      });
      const currentScore = current?.score ?? 0;
      const newScore = Math.max(0, currentScore - TRANSCRIPT_COST);
      await tx.user.update({
        where: { id: userId },
        data: { score: newScore },
      });

      const dailyPoints = Math.max(0, todaysPoints - TRANSCRIPT_COST);
      return { ok: true as const, dailyPoints, totalScore: newScore };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.msg }, { status: result.code });
    }

    // ส่งกลับให้ FE อัปเดต state ได้ทั้งสองค่าพร้อมกัน
    return NextResponse.json({
      message: `รับ transcript สำเร็จ และหัก ${TRANSCRIPT_COST} คะแนนรายวัน + คะแนนสะสมแล้ว`,
      dailyPoints: result.dailyPoints,
      totalScore: result.totalScore,
    });
  } catch (err: any) {
    console.error("claim-transcript error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
