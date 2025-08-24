// app/api/join-booth/route.ts
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
        ? ["query", "error", "warn"]
        : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET!;
const MAX_DAILY_SCORE = 30;

// ใช้ union type ที่ชัดเจนเพื่อกัน never
type JoinTxResult =
  | { ok: true; msg: string; todaysPoints: number }
  | { ok: false; code: 200 | 400; msg: string; todaysPoints: number };

// คิด “วันนี้” ตามเวลาไทย (+07:00) แล้วแปลงเป็น UTC เพื่อ query
function getBangkokDayRange(base: Date = new Date()) {
  const th = new Date(base.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
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
    const body = await req.json().catch(() => null);
    const boothCode = typeof body?.boothCode === "string" ? body.boothCode.trim() : "";

    if (!boothCode) {
      return NextResponse.json({ error: "กรุณาระบุ boothCode" }, { status: 400 });
    }

    // auth
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: ไม่พบ token" }, { status: 401 });
    }

    let payload: { id: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // หา user & booth
    const [user, booth] = await Promise.all([
      prisma.user.findUnique({ where: { id: payload.id }, select: { id: true } }),
      prisma.booth.findUnique({
        where: { booth_code: boothCode },
        select: { id: true, booth_name: true },
      }),
    ]);
    if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    if (!booth) return NextResponse.json({ error: "Booth code ไม่ถูกต้อง" }, { status: 400 });

    const { startUtc, endUtc } = getBangkokDayRange();

    // ทำใน transaction
    const result = await prisma.$transaction(async (tx): Promise<JoinTxResult> => {
      // เคย join บูธนี้แล้วหรือยัง
      const existed = await tx.boothJoin.findFirst({
        where: { userId: user.id, boothId: booth.id },
        select: { id: true },
      });
      if (existed) {
        const [joinsToday, adjSum] = await Promise.all([
          tx.boothJoin.count({
            where: { userId: user.id, joinedAt: { gte: startUtc, lt: endUtc } },
          }),
          tx.pointAdjustment.aggregate({
            _sum: { amount: true },
            where: { userId: user.id, appliedAt: { gte: startUtc, lt: endUtc } },
          }),
        ]);
        const todaysPoints = joinsToday + (adjSum._sum.amount ?? 0);
        return {
          ok: false,
          code: 200,
          msg: "คุณได้เข้าร่วม booth นี้แล้ว",
          todaysPoints,
        };
      }

      // คะแนนวันนี้ (ไทย) ก่อนเพิ่ม
      const [joinsToday, adjSum] = await Promise.all([
        tx.boothJoin.count({
          where: { userId: user.id, joinedAt: { gte: startUtc, lt: endUtc } },
        }),
        tx.pointAdjustment.aggregate({
          _sum: { amount: true },
          where: { userId: user.id, appliedAt: { gte: startUtc, lt: endUtc } },
        }),
      ]);
      const todaysPoints = joinsToday + (adjSum._sum.amount ?? 0);

      if (todaysPoints >= MAX_DAILY_SCORE) {
        return {
          ok: false,
          code: 400,
          msg: `คุณมีคะแนนครบ ${MAX_DAILY_SCORE} คะแนนในวันนี้แล้ว`,
          todaysPoints,
        };
      }

      // สร้าง join (UTC) + เพิ่มคะแนนรวม
      const now = new Date();
      await tx.boothJoin.create({
        data: { userId: user.id, boothId: booth.id, joinedAt: now },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { score: { increment: 1 } },
      });

      return {
        ok: true,
        msg: `เข้าร่วมบูธ "${booth.booth_name}" สำเร็จ (คะแนนวันนี้: ${todaysPoints + 1}/${MAX_DAILY_SCORE})`,
        todaysPoints: todaysPoints + 1,
      };
    });

    // ตอบกลับแบบ type-safe
    if (!result.ok) {
      const body =
        result.code === 200
          ? { message: result.msg, todaysPoints: result.todaysPoints }
          : { error: result.msg, todaysPoints: result.todaysPoints };
      return NextResponse.json(body, { status: result.code });
    }

    return NextResponse.json(
      { message: result.msg, todaysPoints: result.todaysPoints },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("join-booth error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}