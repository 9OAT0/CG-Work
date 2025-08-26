// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
  try {
    const { status, studentId, name, dept } = await req.json();
    const now = new Date();

    console.log("Registration attempt:", {
      status,
      studentId: studentId || "N/A",
      name,
      dept,
    });

    // ✅ ตรวจสอบฟิลด์ที่ต้องกรอก
    if (!status || !name || !dept) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" },
        { status: 400 }
      );
    }

    // ✅ ตรวจสอบ studentId เฉพาะนิสิต
    if (status === "นิสิต") {
      if (!studentId || studentId.trim() === "") {
        console.log("Missing student ID for student registration");
        return NextResponse.json(
          { error: "กรุณากรอกรหัสนิสิต สำหรับการลงทะเบียนนิสิต" },
          { status: 400 }
        );
      }

      const trimmedStudentId = studentId.trim();

      // รูปแบบรหัสนิสิต (8 หลัก)
      if (!/^\d{8}$/.test(trimmedStudentId)) {
        console.log("Invalid student ID format:", trimmedStudentId);
        return NextResponse.json(
          { error: "รหัสนิสิตต้องเป็นตัวเลข 8 หลัก" },
          { status: 400 }
        );
      }

      console.log("Checking for existing student ID:", trimmedStudentId);

      const existingUser = await prisma.user.findFirst({
        where: { student_id: trimmedStudentId },
      });

      if (existingUser) {
        console.log(
          "Student ID already exists:",
          trimmedStudentId,
          "for user:",
          existingUser.name
        );
        return NextResponse.json(
          {
            error: `รหัสนิสิต ${trimmedStudentId} ถูกใช้ลงทะเบียนแล้วโดย ${existingUser.name}`,
          },
          { status: 409 }
        );
      }

      console.log("Student ID is available:", trimmedStudentId);
    } else {
      // ✅ ผู้ที่ไม่ใช่นิสิต: ห้ามชื่อซ้ำในสถานะเดียวกัน (และไม่มี student_id)
      console.log(
        "Checking for existing name for non-student:",
        name.trim(),
        "status:",
        status
      );

      const existingUser = await prisma.user.findFirst({
        where: {
          name: name.trim(),
          status: status,
          student_id: null,
        },
      });

      if (existingUser) {
        console.log(
          "Name already exists for same status:",
          name.trim(),
          "status:",
          existingUser.status
        );
        return NextResponse.json(
          {
            error: `ชื่อ "${name.trim()}" ถูกใช้ลงทะเบียนแล้วในสถานะ ${
              existingUser.status
            }`,
          },
          { status: 409 }
        );
      }

      console.log(
        "Name is available for status:",
        status,
        "name:",
        name.trim()
      );
    }

    // ✅ สร้าง username (ซ้ำได้)
    const username =
      status === "นิสิต" && studentId
        ? studentId.trim()
        : `${name.replace(/\s/g, "")}-${Date.now()}`;

    // ✅ เตรียมข้อมูลผู้ใช้ใหม่
    const userData: any = {
      username,
      status,
      role: "user",
      name,
      dept,
    };

    if (status === "นิสิต" && studentId) {
      userData.student_id = studentId.trim();
    }

    // ✅ บันทึกผู้ใช้ใหม่
    const newUser = await prisma.user.create({ data: userData });

    // (ออปชัน) บันทึก visit แรก
    await prisma.visitLog.create({
      data: {
        userId: newUser.id,
        visitedAt: now,
      },
    });

    // ✅ ไม่ออก JWT / ไม่ set cookie — ให้ผู้ใช้ไป login เอง
    return NextResponse.json(
      {
        message: "ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ",
        redirect: "/login",
        user: {
          id: newUser.id,
          username: newUser.username,
          status: newUser.status,
          name: newUser.name,
          dept: newUser.dept,
          student_id: newUser.student_id ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);

    // Prisma unique constraint
    if (error.code === "P2002") {
      console.log("Unique constraint violation:", error.meta);
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
