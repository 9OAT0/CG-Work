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

function bangkokYMD() {
  const th = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

    const now = new Date(); // เก็บ UTC

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

    // JWT พร้อมฟิลด์ daily login
    const token = jwt.sign(
      {
        id: user.id,
        student_id: user.student_id,
        name: user.name,
        role: user.role,
        lastLoginYMD: bangkokYMD(),      // YYYY-MM-DD (เวลาไทย)
        lastLoginDate: now.toISOString() // ไว้อ่านสำรอง
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({
      message: "เข้าสู่ระบบสำเร็จ",
      user,
      isNewLogin: true,
    });

    res.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
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
