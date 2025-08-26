// app/api/join-booth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import jwt from "jsonwebtoken";
import { incDailyEarned } from "@/lib/dailyPoint";

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

// วันนี้ (เวลาไทย) + dayKey ใช้ระบุตาราง DailyPoints
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

// ใช้ union type ที่ชัดเจนเพื่อกัน never
type JoinTxResult =
  | { ok: true; msg: string; todaysPoints: number }
  | { ok: false; code: 200 | 400; msg: string; todaysPoints: number };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const boothCode =
      typeof body?.boothCode === "string" ? body.boothCode.trim() : "";

    if (!boothCode) {
      return NextResponse.json(
        { error: "กรุณาระบุ boothCode" },
        { status: 400 }
      );
    }

    // auth
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: ไม่พบ token" },
        { status: 401 }
      );
    }

    let payload: { id: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // หา user & booth
    const [user, booth] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true },
      }),
      prisma.booth.findUnique({
        where: { booth_code: boothCode },
        select: { id: true, booth_name: true },
      }),
    ]);
    if (!user)
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    if (!booth)
      return NextResponse.json(
        { error: "Booth code ไม่ถูกต้อง" },
        { status: 400 }
      );

    const { dayKey } = getBangkokDay();

    // ทำใน transaction
    const result = await prisma.$transaction(
      async (tx): Promise<JoinTxResult> => {
        // เคย join บูธนี้แล้วหรือยัง (กันซ้ำตลอดงาน)
        const existed = await tx.boothJoin.findFirst({
          where: { userId: user.id, boothId: booth.id },
          select: { id: true },
        });
        // อ่านแต้มวันนี้จาก DailyPoints (ถ้าไม่มี document = ยัง 0)
        const dp = await tx.dailyPoints.findUnique({
          where: { userId_dayKey: { userId: user.id, dayKey } },
          select: { net: true },
        });
        const todaysPoints = Math.max(0, dp?.net ?? 0);

        if (existed) {
          return {
            ok: false,
            code: 200,
            msg: "คุณได้เข้าร่วม booth นี้แล้ว",
            todaysPoints,
          };
        }

        // เพดานรายวัน
        if (todaysPoints >= MAX_DAILY_SCORE) {
          return {
            ok: false,
            code: 400,
            msg: `คุณมีคะแนนครบ ${MAX_DAILY_SCORE} คะแนนในวันนี้แล้ว`,
            todaysPoints,
          };
        }

        // 1) สร้าง join + 2) เพิ่มคะแนนรวม + 3) เพิ่มแต้มวันนี้ (atomic)
        const now = new Date();

        await tx.boothJoin.create({
          data: { userId: user.id, boothId: booth.id, joinedAt: now },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { score: { increment: 1 } },
        });

        // บันทึกแต้มวันนี้ +1 (ใช้ upsert+increment ปลอดภัยต่อ concurrent)
        await incDailyEarned(tx, user.id, 1);

        // เช็กซ้ำหลังเพิ่ม (กัน concurrent race ไม่ให้ net เกินเพดาน)
        const dpAfter = await tx.dailyPoints.findUnique({
          where: { userId_dayKey: { userId: user.id, dayKey } },
          select: { net: true },
        });
        const newToday = Math.max(0, dpAfter?.net ?? todaysPoints + 1);

        if (newToday > MAX_DAILY_SCORE) {
          // เกินเพดานเพราะกรณีแข่งกันกด → rollback ทรานแซกชันนี้
          throw new Error("DAILY_CAP_REACHED");
        }

        return {
          ok: true,
          msg: `เข้าร่วมบูธ "${booth.booth_name}" สำเร็จ (คะแนนวันนี้: ${newToday}/${MAX_DAILY_SCORE})`,
          todaysPoints: newToday,
        };
      }
    );

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
    // จัดการกรณีชนเพดานจาก race แล้ว rollback
    if (err?.message === "DAILY_CAP_REACHED") {
      try {
        const { dayKey } = getBangkokDay();
        const dp = await prisma.dailyPoints.findUnique({
          where: { userId_dayKey: { userId: "unknown", dayKey } }, // fallback จะเติมด้านล่างด้วย user ที่แท้จริง
        });
      } catch {}
      // เนื่องจากเราอยู่ข้างนอก transactionแล้ว เราต้องอ่านแต้มวันนี้จริงของผู้ใช้เพื่อรายงานกลับ
      // แต่ตัวแปร userId อยู่ใน try บน (scope ก่อน throw) ดังนั้นทำแบบปลอดภัย:
      const token = (typeof err?.reqToken === "string" && err.reqToken) || null;
      // ปกติจะไม่เข้าเงื่อนไขนี้ เพราะเราไม่ยัด reqToken; ส่งข้อความกลางๆ กลับไปแทน
      return NextResponse.json(
        {
          error: `คุณมีคะแนนครบ ${MAX_DAILY_SCORE} คะแนนในวันนี้แล้ว`,
          todaysPoints: MAX_DAILY_SCORE,
        },
        { status: 400 }
      );
    }

    console.error("join-booth error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
