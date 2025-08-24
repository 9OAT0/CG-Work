// app/api/admin/points/adjust/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@/generated/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// Prisma singleton
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET!;
const MAX_DAILY_SCORE = 30; // ใช้ clamp ตอนส่งกลับ (ฝั่ง DB ยังเก็บค่าจริง)

// วันไทย (+07:00) → ช่วงเวลา UTC สำหรับ query
function getBangkokDayRange(base: Date = new Date()) {
  const th = new Date(base.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  const dayStr = `${y}-${m}-${d}`;
  return {
    startUtc: new Date(`${dayStr}T00:00:00.000+07:00`),
    endUtc:   new Date(`${dayStr}T23:59:59.999+07:00`),
  };
}

async function withTxRetry<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, max = 5): Promise<T> {
  let i = 0;
  while (true) {
    try {
      return await prisma.$transaction((tx) => fn(tx));
    } catch (e: any) {
      const conflict = e?.code === "P2034" || /write conflict|deadlock/i.test(e?.message || "");
      if (conflict && ++i < max) {
        await new Promise((r) => setTimeout(r, 100 * i)); // backoff
        continue;
      }
      throw e;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // auth แอดมิน
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: { id: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({ where: { id: payload.id }, select: { role: true } });
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // body
    const { userId, amount, reason } = await req.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "กรุณาระบุ userId" }, { status: 400 });
    }
    if (!Number.isInteger(amount)) {
      return NextResponse.json({ error: "amount ต้องเป็นจำนวนเต็ม" }, { status: 400 });
    }
    if (amount === 0) {
      return NextResponse.json({ error: "amount ต้องไม่เท่ากับ 0" }, { status: 400 });
    }

    const { startUtc, endUtc } = getBangkokDayRange();

    const result = await withTxRetry(async (tx) => {
      // ตรวจผู้ใช้ + คะแนนปัจจุบัน
      const u = await tx.user.findUnique({ where: { id: userId }, select: { id: true, score: true } });
      if (!u) return { ok: false as const, code: 404, msg: "ไม่พบผู้ใช้" };

      // 1) บันทึกการปรับ “รายวัน” (PointAdjustment) บวก/ลบได้
      await tx.pointAdjustment.create({
        data: {
          userId,
          amount,
          reason: reason || undefined,
          appliedAt: new Date(), // UTC
        },
      });

      // 2) เชื่อมกับคะแนนสะสม (score) โดยตรง และไม่ให้ติดลบ
      const newScore = Math.max(0, (u.score ?? 0) + amount);
      await tx.user.update({ where: { id: userId }, data: { score: newScore } });

      // 3) คำนวณ dailyPoints วันนี้ (ไทย) = joinsToday + sum(adjustmentsToday)
      const [joinsToday, adjSum] = await Promise.all([
        tx.boothJoin.count({ where: { userId, joinedAt: { gte: startUtc, lt: endUtc } } }),
        tx.pointAdjustment.aggregate({
          _sum: { amount: true },
          where: { userId, appliedAt: { gte: startUtc, lt: endUtc } },
        }),
      ]);

      const rawDaily = joinsToday + (adjSum._sum.amount ?? 0);
      const dailyPoints = Math.max(0, Math.min(MAX_DAILY_SCORE, rawDaily)); // clamp 0..30 เฉพาะค่าส่งกลับ

      return { ok: true as const, dailyPoints, totalScore: newScore, delta: amount };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.msg }, { status: result.code });
    }

    return NextResponse.json({
      message: result.delta >= 0 ? `เพิ่มคะแนนรายวัน +${result.delta} สำเร็จ` : `ลดคะแนนรายวัน ${result.delta} สำเร็จ`,
      data: {
        dailyPoints: result.dailyPoints, // สำหรับโชว์ “คะแนนวันนี้”
        totalScore: result.totalScore,   // คะแนนสะสมหลังเชื่อม
      },
    });
  } catch (err: any) {
    console.error("points/adjust error:", err);
    return NextResponse.json({ error: "Internal Server Error", detail: err?.message }, { status: 500 });
  }
}
