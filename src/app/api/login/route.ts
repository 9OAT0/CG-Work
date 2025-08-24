// app/api/login/route.ts (หรือไฟล์ที่คุณใช้สำหรับ POST login)
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import jwt from "jsonwebtoken";
// ❌ ลบ: import { getThailandTime } from "@/lib/time";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  const { student_id, name } = await req.json();

  if (!name) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อ-นามสกุล" },
      { status: 400 }
    );
  }

  let user;
  if (student_id && student_id.trim() !== "") {
    user = await prisma.user.findFirst({
      where: {
        student_id: student_id.trim(),
        name: name.trim(),
        status: "นิสิต",
      },
    });
  } else {
    user = await prisma.user.findFirst({
      where: { name: name.trim(), status: { not: "นิสิต" } },
    });
  }

  if (!user) {
    const errorMsg = student_id
      ? "ไม่พบข้อมูลนิสิตที่ตรงกับรหัสนิสิตและชื่อที่กรอก"
      : "ไม่พบข้อมูลผู้ใช้งานที่ตรงกับชื่อที่กรอก";
    return NextResponse.json({ error: errorMsg }, { status: 404 });
  }

  // ✅ ใช้เวลาปัจจุบันแบบ UTC ตรง ๆ
  const now = new Date();

  // บันทึก visit log
  await prisma.visitLog.create({
    data: {
      userId: user.id,
      visitedAt: now, // ❗ เก็บ UTC
    },
  });

  // อัปเดต lastLoginDate
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginDate: now, // ❗ เก็บ UTC
      maintenanceLoggedOut: false,
    },
  });

  // บันทึก login history
  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      loginDate: now, // ❗ เก็บ UTC
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    },
  });

  // สร้าง JWT
  const token = jwt.sign(
    {
      id: user.id,
      student_id: user.student_id,
      name: user.name,
      role: user.role,
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
    path: "/", // แนะนำใส่ให้แน่ใจว่า cookie เห็นทั้งไซต์
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
