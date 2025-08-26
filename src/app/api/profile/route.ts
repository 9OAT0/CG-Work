// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import jwt from "jsonwebtoken";
import {
  withErrorHandler,
  AuthenticationError,
  NotFoundError,
} from "@/lib/middleware/errorHandler";
import { validateRequest, updateProfileSchema } from "@/lib/validation/schemas";
import { withRateLimit, apiRateLimit } from "@/lib/middleware/rateLimit";

export const runtime = "nodejs";

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
const MAX_DAILY_SCORE = 30; // ✅ เพดานแต้มรายวัน

// --- helpers เวลาไทย ---
function getBangkokDayKey(date?: Date) {
  const base = date ?? new Date();
  const th = new Date(
    base.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`; // YYYY-MM-DD (เวลาไทย)
}

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
  // auth
  const token = req.cookies.get("token")?.value;
  if (!token) throw new AuthenticationError("Unauthorized");

  let payload: { id: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string };
  } catch {
    throw new AuthenticationError("Invalid token");
  }

  // user + transcript logs (เฉพาะวันที่)
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      name: true,
      student_id: true,
      status: true,
      dept: true,
      score: true,
      TranscriptLog: { select: { date: true } },
    },
  });
  if (!user) throw new NotFoundError("User not found");

  // ✅ อ่านแต้มวันนี้จากตาราง DailyPoints (เร็ว/ตรงเวลาไทย)
  const dayKey = getBangkokDayKey();
  const dp = await prisma.dailyPoints.findUnique({
    where: { userId_dayKey: { userId: payload.id, dayKey } },
    select: { net: true, earned: true, spent: true, adjusted: true },
  });

  const dailyNet = Math.max(0, Math.min(MAX_DAILY_SCORE, dp?.net ?? 0));

  const transcriptDates = user.TranscriptLog.map((log) =>
    toTHDateYYYYMMDD(log.date)
  );

  return NextResponse.json(
    {
      name: user.name,
      student_id: user.student_id,
      status: user.status,
      dept: user.dept,
      dailyPoints: dailyNet, // ✅ แต้มวันนี้ (สุทธิ) จาก DailyPoints
      dailyBreakdown: dp
        ? { earned: dp.earned, spent: dp.spent, adjusted: dp.adjusted }
        : { earned: 0, spent: 0, adjusted: 0 },
      totalPoints: user.score, // คะแนนสะสมรวม
      transcriptDates,
    },
    {
      headers: {
        "Cache-Control": "no-store",
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
