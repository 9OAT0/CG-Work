// app/api/admin/points/adjust/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

export const runtime = "nodejs";

// Prisma singleton
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ใช้ /api/me เพื่อตรวจ session + role
async function getMe(request: NextRequest) {
  const res = await fetch(new URL("/api/me", request.url), {
    headers: { Cookie: request.headers.get("cookie") || "" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; role: "admin" | "user" }>;
}

// ช่วง "วันนี้" ตามเวลาไทย (+07:00) → แปลงเป็น UTC สำหรับ query
function getBangkokDayRange(base: Date = new Date()) {
  const th = new Date(base.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  const dayStr = `${y}-${m}-${d}`;
  return {
    startUtc: new Date(`${dayStr}T00:00:00.000+07:00`),
    endUtc: new Date(`${dayStr}T23:59:59.999+07:00`),
    dayStr,
  };
}

// POST /api/admin/points/adjust
// body: { userId: string, amount: number, reason?: string }
export async function POST(req: NextRequest) {
  try {
    const me = await getMe(req);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "admin")
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;
    const rawAmount = body?.amount;
    const reason: string | undefined = body?.reason;

    // validation เบื้องต้น
    const amount =
      typeof rawAmount === "string" ? parseInt(rawAmount, 10) : Number(rawAmount);
    if (!userId || !/^[a-f0-9]{24}$/i.test(userId))
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    if (!Number.isInteger(amount) || Math.abs(amount) > 1_000_000)
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const { startUtc, endUtc } = getBangkokDayRange();

    // ทำใน transaction: จด log + อัปเดตคะแนนรวม + คำนวณผลสรุปวันนี้
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, score: true },
      });
      if (!user) return { ok: false as const, code: 404, msg: "ไม่พบผู้ใช้งาน" };

      await tx.pointAdjustment.create({
        data: { userId, amount, reason: reason ?? null },
      });

      await tx.user.update({
        where: { id: userId },
        data: { score: { increment: amount } },
      });

      const [joinsToday, adjSum, userAfter] = await Promise.all([
        tx.boothJoin.count({
          where: { userId, joinedAt: { gte: startUtc, lt: endUtc } },
        }),
        tx.pointAdjustment.aggregate({
          _sum: { amount: true },
          where: { userId, appliedAt: { gte: startUtc, lt: endUtc } },
        }),
        tx.user.findUnique({ where: { id: userId }, select: { score: true } }),
      ]);

      const dailyPoints = joinsToday + (adjSum._sum.amount ?? 0);
      return {
        ok: true as const,
        dailyPoints,
        totalScore: userAfter?.score ?? 0,
      };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.msg }, { status: result.code });
    }

    return NextResponse.json({
      message:
        amount >= 0
          ? `เพิ่ม ${amount} คะแนนให้วันนี้สำเร็จ`
          : `หัก ${-amount} คะแนนสำเร็จ`,
      data: {
        dailyPoints: result.dailyPoints,
        totalScore: result.totalScore,
      },
    });
  } catch (e) {
    console.error("points/adjust error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}