import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// Prisma singleton (กัน hot reload เปิดคอนเนกชันเยอะ)
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

// ช่วยคืน YYYY-MM-DD ตามเวลาไทย (Bangkok)
function toBangkokYMD(d: Date) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    .toLocaleString("en-CA", { timeZone: "Asia/Bangkok", hour12: false })
    .slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const { status, studentId, name, dept } = await req.json();
    const now = new Date();

    // ✅ ตรวจข้อมูลบังคับ
    if (!status || !name || !dept) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" },
        { status: 400 }
      );
    }

    // ✅ ตรวจ studentId เฉพาะนิสิต
    if (status === "นิสิต") {
      if (!studentId || studentId.trim() === "") {
        return NextResponse.json(
          { error: "กรุณากรอกรหัสนิสิต สำหรับการลงทะเบียนนิสิต" },
          { status: 400 }
        );
      }
      const trimmedStudentId = studentId.trim();
      if (!/^\d{8}$/.test(trimmedStudentId)) {
        return NextResponse.json(
          { error: "รหัสนิสิตต้องเป็นตัวเลข 8 หลัก" },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findFirst({
        where: { student_id: trimmedStudentId },
        select: { id: true, name: true },
      });
      if (existingUser) {
        return NextResponse.json(
          {
            error: `รหัสนิสิต ${trimmedStudentId} ถูกใช้ลงทะเบียนแล้วโดย ${existingUser.name}`,
          },
          { status: 409 }
        );
      }
    } else {
      // ✅ ผู้ที่ไม่ใช่นิสิต: กันชื่อซ้ำในสถานะเดียวกัน
      const existingUser = await prisma.user.findFirst({
        where: {
          name: name.trim(),
          status,
          student_id: null,
        },
        select: { id: true, status: true },
      });
      if (existingUser) {
        return NextResponse.json(
          {
            error: `ชื่อ "${name.trim()}" ถูกใช้ลงทะเบียนแล้วในสถานะ ${existingUser.status}`,
          },
          { status: 409 }
        );
      }
    }

    // ✅ สร้าง username
    const username =
      status === "นิสิต" && studentId
        ? studentId.trim()
        : `${name.replace(/\s/g, "")}-${Date.now()}`;

    // ✅ เตรียมข้อมูล user (อัปเดต lastLoginDate ตั้งแต่สมัคร)
    const userData: any = {
      username,
      status,
      role: "user",
      name,
      dept,
      lastLoginDate: now, // สำคัญเพื่อให้ middleware ผ่าน
    };
    if (status === "นิสิต" && studentId) {
      userData.student_id = studentId.trim();
    }

    // ✅ สร้างผู้ใช้
    const newUser = await prisma.user.create({ data: userData });

    // ✅ บันทึก visit log ครั้งแรก
    await prisma.visitLog.create({
      data: { userId: newUser.id, visitedAt: now },
    });

    // ✅ ออก JWT พร้อมฝัง daily-login fields
    const token = jwt.sign(
      {
        id: newUser.id,
        student_id: newUser.student_id,
        name: newUser.name,
        role: newUser.role,
        lastLoginYMD: toBangkokYMD(now),    // <— ใช้ middleware เช็ก daily login
        lastLoginDate: now.toISOString(),   // <— สำรอง
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ ตอบกลับ + set cookie
    const response = NextResponse.json(
      { message: "ลงทะเบียนและเข้าสู่ระบบสำเร็จ", user: newUser },
      { status: 201 }
    );
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 วัน
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);

    // Prisma unique constraint (ถ้ามี)
    if (error.code === "P2002") {
      if (error.meta?.target?.includes("student_id")) {
        return NextResponse.json(
          { error: "รหัสนิสิตนี้ถูกใช้ลงทะเบียนแล้ว" },
          { status: 409 }
        );
      } else if (error.meta?.target?.includes("name")) {
        return NextResponse.json(
          { error: "ชื่อนี้ถูกใช้ลงทะเบียนแล้ว" },
          { status: 409 }
        );
      } else if (error.meta?.target?.includes("username")) {
        return NextResponse.json(
          { error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: "ข้อมูลนี้ถูกใช้ลงทะเบียนแล้ว" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
