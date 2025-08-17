import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@/generated/prisma';
import jwt from "jsonwebtoken";
import { getThailandTime } from "@/lib/time";

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

  // ✅ ถ้ามีรหัสนิสิต ค้นหาด้วยรหัสนิสิตและชื่อ (สำหรับนิสิต)
  if (student_id && student_id.trim() !== '') {
    user = await prisma.user.findFirst({
      where: { 
        student_id: student_id.trim(), 
        name: name.trim(),
        status: 'นิสิต'
      },
    });
  } else {
    // ✅ ถ้าไม่มีรหัสนิสิต ค้นหาด้วยชื่อเท่านั้น (สำหรับไม่ใช่นิสิต)
    // ค้นหาผู้ใช้ที่ไม่ใช่นิสิต โดยไม่สนใจ student_id field
    user = await prisma.user.findFirst({
      where: { 
        name: name.trim(),
        status: { not: 'นิสิต' }
      },
    });
  }

  if (!user) {
    const errorMsg = student_id 
      ? "ไม่พบข้อมูลนิสิตที่ตรงกับรหัสนิสิตและชื่อที่กรอก" 
      : "ไม่พบข้อมูลผู้ใช้งานที่ตรงกับชื่อที่กรอก";
    return NextResponse.json({ error: errorMsg }, { status: 404 });
  }

  // ✅ บันทึก visit log หลังพบ user
  await prisma.visitLog.create({
    data: {
      userId: user.id,
      visitedAt: getThailandTime()
    },
  });

  // ✅ สร้าง JWT
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

  const res = NextResponse.json({ message: "เข้าสู่ระบบสำเร็จ", user });
  res.cookies.set({
    name: "token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 วัน
  });

  return res;
}
