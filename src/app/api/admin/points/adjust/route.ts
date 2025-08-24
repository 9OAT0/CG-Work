// app/api/admin/points/adjust/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// Prisma singleton
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

// วันไทย (+07:00) → สร้างช่วงเวลา UTC สำหรับ query
function getBangkokDayRange(base: Date = new Date()) {
  const th = new Date(
    base.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  const dayStr = `${y}-${m}-${d}`;
  return {
    startUtc: new Date(`${dayStr}T00:00:00.000+07:00`),
    endUtc: new Date(`${dayStr}T23:59:59.999+07:00`),
  };
}

export async function POST(req: NextRequest) {
  try {
    // auth แอดมิน
    const token = req.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: { id: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { role: true },
    });
    if (!me || me.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // body
    const { userId, amount, reason } = await req.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "กรุณาระบุ userId" }, { status: 400 });
    }
    if (!Number.isInteger(amount)) {
      return NextResponse.json(
        { error: "amount ต้องเป็นจำนวนเต็ม" },
        { status: 400 }
      );
    }
    if (amount === 0) {
      return NextResponse.json(
        { error: "amount ต้องไม่เท่ากับ 0" },
        { status: 400 }
      );
    }

    // ตรวจผู้ใช้ปลายทาง
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, score: true },
    });
    if (!user)
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

    const { startUtc, endUtc } = getBangkokDayRange();

    // ✅ บันทึกการปรับเฉพาะรายวัน (PointAdjustment) — ไม่แตะ user.score
    await prisma.pointAdjustment.create({
      data: {
        userId,
        amount, // บวก/ลบได้
        reason: reason || undefined,
        appliedAt: new Date(), // เก็บ UTC
      },
    });

    // คำนวณ dailyPoints ล่าสุด (ไทยวันปัจจุบัน)
    const [joinsToday, adjSum] = await Promise.all([
      prisma.boothJoin.count({
        where: { userId, joinedAt: { gte: startUtc, lt: endUtc } },
      }),
      prisma.pointAdjustment.aggregate({
        _sum: { amount: true },
        where: { userId, appliedAt: { gte: startUtc, lt: endUtc } },
      }),
    ]);
    const dailyPoints = joinsToday + (adjSum._sum.amount ?? 0);

    return NextResponse.json({
      message:
        amount >= 0
          ? `เพิ่มคะแนนรายวัน +${amount} สำเร็จ`
          : `ลดคะแนนรายวัน ${amount} สำเร็จ`,
      data: {
        dailyPoints, // ✅ ใช้แสดง “คะแนนวันนี้”
        totalScore: user.score, // ❌ ไม่เปลี่ยน totalScore
      },
    });
  } catch (err: any) {
    console.error("points/adjust error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: err?.message },
      { status: 500 }
    );
  }
}
