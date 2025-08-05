import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { getThailandTime } from '@/lib/time'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
  try {
    const { status, studentId, name, dept } = await req.json()

    // ✅ ตรวจสอบฟิลด์ที่ต้องกรอก
    if (!status || !name || !dept) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' }, { status: 400 })
    }

    // ✅ ตรวจสอบ studentId เฉพาะนิสิต
    if (status === 'นิสิต') {
      if (!studentId || studentId.trim() === '') {
        return NextResponse.json({ error: 'กรุณากรอกรหัสนิสิต' }, { status: 400 })
      }

      const existingUser = await prisma.user.findUnique({
        where: { student_id: studentId }
      })

      if (existingUser) {
        return NextResponse.json({ error: 'รหัสนิสิตนี้ถูกใช้ลงทะเบียนแล้ว' }, { status: 409 })
      }
    }

    // ✅ สร้าง username (สามารถซ้ำกันได้)
    const username = studentId || `${name.replace(/\s/g, '')}-${Date.now()}`

    // ✅ บันทึกผู้ใช้ใหม่
    const newUser = await prisma.user.create({
      data: {
        username,
        student_id: studentId || null,
        status,
        role: 'user',
        name,
        dept
      }
    })

    // ✅ บันทึก visit log สำหรับการเข้าสู่ระบบครั้งแรก
    await prisma.visitLog.create({
      data: {
        userId: newUser.id,
        visitedAt: getThailandTime()
      },
    })

    // ✅ สร้าง JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        student_id: newUser.student_id,
        name: newUser.name,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // ✅ สร้าง response พร้อม set cookie
    const response = NextResponse.json(
      { message: 'ลงทะเบียนและเข้าสู่ระบบสำเร็จ', user: newUser },
      { status: 201 }
    )

    // ✅ Set JWT token ใน cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 วัน
    })

    return response

  } catch (error: any) {
    console.error('Registration error:', error)
    
    // ตรวจสอบ Prisma unique constraint error
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('student_id')) {
        return NextResponse.json({ error: 'รหัสนิสิตนี้ถูกใช้ลงทะเบียนแล้ว' }, { status: 409 })
      }
    }
    
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง' }, { status: 500 })
  }
}
