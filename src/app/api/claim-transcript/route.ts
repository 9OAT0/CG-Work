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
const TRANSCRIPT_COST = 10; // เกณฑ์ขั้นต่ำ (ไม่หักแต้ม)

// ===== Helpers: เวลาไทย & daily check =====
function bangkokYMD(d?: Date): string {
  const date = d ?? new Date();
  const th = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const dd = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function toBangkokYMD(d: Date) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    .toLocaleString("en-CA", { timeZone: "Asia/Bangkok", hour12: false })
    .slice(0, 10);
}
function staleDailyToken(payload: any): boolean {
  const today = bangkokYMD();
  const iatYMD =
    typeof payload?.iat === "number" ? toBangkokYMD(new Date(payload.iat * 1000)) : undefined;

  const claimedLastDate =
    typeof payload?.lastLoginDate === "number"
      ? new Date(payload.lastLoginDate)
      : typeof payload?.lastLoginDate === "string"
      ? new Date(payload.lastLoginDate)
      : undefined;

  const lastYMD: string | undefined =
    (payload?.lastLoginYMD as string) ||
    (claimedLastDate ? toBangkokYMD(claimedLastDate) : undefined) ||
    iatYMD;

  return lastYMD !== today;
}

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
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET) as any; // exp หมด/ปลอม → throw
    } catch {
      const res = NextResponse.json({ error: "Invalid token" }, { status: 401 });
      res.cookies.set("token", "", { path: "/", expires: new Date(0) }); // ล้างคุกกี้
      return res;
    }

    // ✅ Daily enforcement: ข้ามวัน (เวลาไทย) → ล้างคุกกี้ + 401
    if (staleDailyToken(payload)) {
      const res = NextResponse.json(
        { error: "Session expired. Please login again." },
        { status: 401 }
      );
      res.cookies.set("token", "", { path: "/", expires: new Date(0) });
      return res;
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

      // บันทึก Log (มี unique (userId, dayKey) ที่ schema จะยิ่งชัวร์)
      try {
        await tx.transcriptLog.create({
          data: { userId, date: new Date(), dayKey },
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

      // ✅ ไม่หักแต้ม
      const dailyPoints = todaysPoints;

      // คะแนนสะสมคงเดิม
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { score: true },
      });
      const totalScore = current?.score ?? 0;

      return { ok: true as const, dailyPoints, totalScore };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.msg }, { status: result.code });
    }

    return NextResponse.json({
      message: "รับ transcript สำเร็จ (ไม่มีการหักคะแนน)",
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