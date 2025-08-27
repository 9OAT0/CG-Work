// app/api/join-booth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import jwt from "jsonwebtoken";
import { incDailyEarned } from "@/lib/dailyPoint";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;
const MAX_DAILY_SCORE = 30;

// ===== helpers เวลาไทย + daily check (เหมือนเดิม) =====
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
  const iatYMD = typeof payload?.iat === "number" ? toBangkokYMD(new Date(payload.iat * 1000)) : undefined;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const boothCode = typeof body?.boothCode === "string" ? body.boothCode.trim() : "";
    const qrToken = typeof body?.qrToken === "string" ? body.qrToken.trim() : "";

    const rawToken = req.cookies.get("token")?.value;
    if (!rawToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let authPayload: any;
    try {
      authPayload = jwt.verify(rawToken, JWT_SECRET);
    } catch {
      const res = NextResponse.json({ error: "Invalid token" }, { status: 401 });
      res.cookies.set("token", "", { path: "/", expires: new Date(0) });
      return res;
    }
    if (staleDailyToken(authPayload)) {
      const res = NextResponse.json({ error: "Session expired. Please login again." }, { status: 401 });
      res.cookies.set("token", "", { path: "/", expires: new Date(0) });
      return res;
    }

    // --- ดึง boothId จาก qrToken หรือใช้ boothCode แบบเดิม ---
    let boothIdFromQR: string | null = null;
    if (qrToken) {
      try {
        const q = jwt.verify(qrToken, JWT_SECRET) as any;
        if (q?.purpose !== "join_booth" || typeof q?.boothId !== "string") {
          return NextResponse.json({ error: "Invalid QR token" }, { status: 400 });
        }
        boothIdFromQR = q.boothId;
      } catch {
        return NextResponse.json({ error: "Invalid or expired QR token" }, { status: 400 });
      }
    }
    if (!boothIdFromQR && !boothCode) {
      return NextResponse.json({ error: "กรุณาระบุ boothCode หรือ qrToken" }, { status: 400 });
    }

    // --- เตรียมข้อมูล user / booth ---
    const userId = (authPayload as any).id as string;
    const [user, booth] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      boothIdFromQR
        ? prisma.booth.findUnique({ where: { id: boothIdFromQR }, select: { id: true, booth_name: true } })
        : prisma.booth.findUnique({ where: { booth_code: boothCode }, select: { id: true, booth_name: true } }),
    ]);
    if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    if (!booth) return NextResponse.json({ error: "Booth ไม่ถูกต้อง" }, { status: 400 });

    // --- ทำธุรกรรมเหมือนเดิม ---
    const result = await prisma.$transaction(async (tx) => {
      const existed = await tx.boothJoin.findFirst({
        where: { userId: user.id, boothId: booth.id },
        select: { id: true },
      });

      // คะแนนวันนี้ก่อนเพิ่ม
      const dpBefore = await tx.dailyPoints.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { net: true },
      });
      const todaysPoints = Math.max(0, dpBefore?.net ?? 0);

      if (existed) {
        return { ok: false, code: 200, msg: "คุณได้เข้าร่วม booth นี้แล้ว", todaysPoints };
      }
      if (todaysPoints >= MAX_DAILY_SCORE) {
        return { ok: false, code: 400, msg: `คุณมีคะแนนครบ ${MAX_DAILY_SCORE} คะแนนในวันนี้แล้ว`, todaysPoints };
      }

      const now = new Date();
      await tx.boothJoin.create({ data: { userId: user.id, boothId: booth.id, joinedAt: now } });
      await tx.user.update({ where: { id: user.id }, data: { score: { increment: 1 } } });

      const { net: afterNet } = await incDailyEarned(tx, user.id, 1);
      if (afterNet > MAX_DAILY_SCORE) throw new Error("DAILY_CAP_REACHED");

      return { ok: true, msg: `เข้าร่วมบูธ "${booth.booth_name}" สำเร็จ (คะแนนวันนี้: ${afterNet}/${MAX_DAILY_SCORE})`, todaysPoints: afterNet };
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
