// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma"; // หรือ @prisma/client ถ้าคุณเปลี่ยนตามข้อแนะนำ
import jwt from "jsonwebtoken";
import {
  withErrorHandler,
  AuthenticationError,
  NotFoundError,
} from "@/lib/middleware/errorHandler";
import { validateRequest, updateProfileSchema } from "@/lib/validation/schemas";
import { withRateLimit, apiRateLimit } from "@/lib/middleware/rateLimit";
import { thaiDayKey } from "@/lib/dailyPoint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 👈 ปิด cache
export const revalidate = 0; // 👈 ปิด cache

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

function toTHDateYYYYMMDD(date: Date) {
  const th = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function getProfileHandler(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) throw new AuthenticationError("Unauthorized");

  let payload: { id: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string };
  } catch {
    throw new AuthenticationError("Invalid token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      name: true,
      student_id: true,
      status: true,
      dept: true,
      score: true, // รวมทั้งหมด
      TranscriptLog: { select: { date: true } },
    },
  });
  if (!user) throw new NotFoundError("User not found");

  // ✅ คะแนนวันนี้อ่านจาก DailyPoints.net (ถ้าเอกสารยังไม่มีให้ถือว่า 0)
  const dayKey = thaiDayKey();
  let dailyPoints = 0;
  try {
    const dp = await prisma.dailyPoints.findUnique({
      where: { userId_dayKey: { userId: payload.id as string, dayKey } },
      select: { net: true },
    });
    dailyPoints = Math.max(0, dp?.net ?? 0);
  } catch (e) {
    // ถ้า client เก่า/ไม่รู้จัก model — จะมาเข้าที่นี่ (หลังจาก generate ใหม่แล้วจะหาย)
    dailyPoints = 0;
  }

  const transcriptDates = user.TranscriptLog.map((log) =>
    toTHDateYYYYMMDD(log.date)
  );

  console.log(dailyPoints);

  return NextResponse.json(
    {
      name: user.name,
      student_id: user.student_id,
      status: user.status,
      dept: user.dept,
      dailyPoints,
      totalPoints: user.score,
      transcriptDates,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      },
    }
  );
}

async function updateProfileHandler(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) throw new AuthenticationError("Unauthorized");

  let payload: { id: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string };
  } catch {
    throw new AuthenticationError("Invalid token");
  }

  const body = await req.json();
  const validatedData = validateRequest(updateProfileSchema, body);

  const updatedUser = await prisma.user.update({
    where: { id: payload.id },
    data: validatedData,
    select: { id: true, name: true, dept: true, year: true },
  });

  return NextResponse.json({
    message: "อัปเดตโปรไฟล์สำเร็จ",
    user: updatedUser,
  });
}

export const GET = withRateLimit(
  apiRateLimit,
  withErrorHandler(getProfileHandler)
);
export const PUT = withRateLimit(
  apiRateLimit,
  withErrorHandler(updateProfileHandler)
);
