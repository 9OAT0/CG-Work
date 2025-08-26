// app/api/join-booth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import jwt from "jsonwebtoken";
import { incDailyEarned } from "@/lib/dailyPoint";

export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET!;
const MAX_DAILY_SCORE = 30;

type JoinTxResult =
  | { ok: true; msg: string; todaysPoints: number }
  | { ok: false; code: 200 | 400; msg: string; todaysPoints: number };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const boothCode = typeof body?.boothCode === "string" ? body.boothCode.trim() : "";
    if (!boothCode) return NextResponse.json({ error: "กรุณาระบุ boothCode" }, { status: 400 });

    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: { id: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const [user, booth] = await Promise.all([
      prisma.user.findUnique({ where: { id: payload.id }, select: { id: true } }),
      prisma.booth.findUnique({ where: { booth_code: boothCode }, select: { id: true, booth_name: true } }),
    ]);
    if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    if (!booth) return NextResponse.json({ error: "Booth code ไม่ถูกต้อง" }, { status: 400 });

    const result = await prisma.$transaction(async (tx): Promise<JoinTxResult> => {
      // กันซ้ำทั้งงาน
      const existed = await tx.boothJoin.findFirst({
        where: { userId: user.id, boothId: booth.id },
        select: { id: true },
      });

      // คะแนนวันนี้ (from DailyPoints.net) ก่อนเพิ่ม
      const dpBefore = await tx.dailyPoints.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" }, // เผื่อยังไม่มีของวัน ให้ปลอดภัย
        select: { net: true },
      });
      const todaysPoints = Math.max(0, dpBefore?.net ?? 0);

      if (existed) {
        return { ok: false, code: 200, msg: "คุณได้เข้าร่วม booth นี้แล้ว", todaysPoints };
      }
      if (todaysPoints >= MAX_DAILY_SCORE) {
        return { ok: false, code: 400, msg: `คุณมีคะแนนครบ ${MAX_DAILY_SCORE} คะแนนในวันนี้แล้ว`, todaysPoints };
      }

      // 1) join  2) total +=1  3) daily(net) +=1
      const now = new Date();
      await tx.boothJoin.create({ data: { userId: user.id, boothId: booth.id, joinedAt: now } });
      await tx.user.update({ where: { id: user.id }, data: { score: { increment: 1 } } });

      const { net: afterNet } = await incDailyEarned(tx, user.id, 1);
      if (afterNet > MAX_DAILY_SCORE) throw new Error("DAILY_CAP_REACHED");

      return {
        ok: true,
        msg: `เข้าร่วมบูธ "${booth.booth_name}" สำเร็จ (คะแนนวันนี้: ${afterNet}/${MAX_DAILY_SCORE})`,
        todaysPoints: afterNet,
      };
    });

    if (!result.ok) {
      const body =
        result.code === 200
          ? { message: result.msg, todaysPoints: result.todaysPoints }
          : { error: result.msg, todaysPoints: result.todaysPoints };
      return NextResponse.json(body, { status: result.code });
    }

    return NextResponse.json({ message: result.msg, todaysPoints: result.todaysPoints }, { status: 200 });
  } catch (err: any) {
    if (err?.message === "DAILY_CAP_REACHED") {
      return NextResponse.json(
        { error: `คุณมีคะแนนครบ ${MAX_DAILY_SCORE} คะแนนในวันนี้แล้ว`, todaysPoints: MAX_DAILY_SCORE },
        { status: 400 }
      );
    }
    console.error("join-booth error:", err);
    return NextResponse.json({ error: "Internal Server Error", detail: err?.message ?? String(err) }, { status: 500 });
  }
}
