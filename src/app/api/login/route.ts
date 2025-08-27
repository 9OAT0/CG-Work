// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// Prisma singleton (กัน hot-reload เปิด connection เยอะใน dev)
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
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET");
}

// YYYY-MM-DD เวลาไทย
function bangkokYMD() {
  const th = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** คืนค่า Date (UTC) ที่ตรงกับเที่ยงคืนไทยของวันถัดไป */
function nextBangkokMidnightUTC(): Date {
  const now = new Date();
  const UTC_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Bangkok = UTC+7
  const bkkNow = new Date(now.getTime() + UTC_OFFSET_MS);

  const y = bkkNow.getUTCFullYear();
  const m = bkkNow.getUTCMonth();
  const d = bkkNow.getUTCDate();

  // เที่ยงคืนวันถัดไป (เวลาไทย) แล้วแปลงกลับเป็น UTC
  const nextMidnightUTC = Date.UTC(y, m, d + 1, 0, 0, 0) - UTC_OFFSET_MS;
  return new Date(nextMidnightUTC);
}

export async function POST(req: NextRequest) {
  try {
    const { student_id, name } = await req.json();

    const nameTrim = (name || "").trim();
    const sidTrim = (student_id || "").trim();

    if (!nameTrim) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อ-นามสกุล" },
        { status: 400 }
      );
    }

    // หา user
    const user =
      sidTrim !== ""
        ? await prisma.user.findFirst({
          where: { student_id: sidTrim, name: nameTrim, status: "นิสิต" },
        })
        : await prisma.user.findFirst({
          where: { name: nameTrim, status: { not: "นิสิต" } },
        });

    if (!user) {
      const errorMsg =
        sidTrim !== ""
          ? "ไม่พบข้อมูลนิสิตที่ตรงกับรหัสนิสิตและชื่อที่กรอก"
          : "ไม่พบข้อมูลผู้ใช้งานที่ตรงกับชื่อที่กรอก";
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }

    const now = new Date(); // UTC

    // visit log
    await prisma.visitLog.create({
      data: { userId: user.id, visitedAt: now },
    });

    // อัปเดต lastLoginDate
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginDate: now, maintenanceLoggedOut: false },
    });

    // login history
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        loginDate: now,
        ipAddress:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    // ===== สำคัญ: ให้โทเคนหมดอายุ "เที่ยงคืนไทย" ของวันนั้น =====
    const expiresAt = nextBangkokMidnightUTC();         // Date (UTC)
    const exp = Math.floor(expiresAt.getTime() / 1000); // seconds epoch

    // สร้าง JWT (กำหนด exp เอง; ไม่ใช้ expiresIn 7d)
    const token = jwt.sign(
      {
        id: user.id,
        student_id: user.student_id,
        name: user.name,
        role: user.role,
        lastLoginYMD: bangkokYMD(),      // YYYY-MM-DD (เวลาไทย) — ใช้เช็ครายวัน
        lastLoginDate: now.toISOString(),// สำรองให้ middleware คำนวณ YMD ได้
        exp,                              // บังคับหมดอายุเที่ยงคืนไทย
      },
      JWT_SECRET
    );

    const res = NextResponse.json({
      message: "เข้าสู่ระบบสำเร็จ",
      user,
      isNewLogin: true,
    });

    // คุกกี้หมดอายุพร้อม JWT
    res.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return res;
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
