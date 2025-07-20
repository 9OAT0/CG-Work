import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    await prisma.user.create({
      data: {
        username,
        student_id: studentId || null,
        status,
        role: 'user',
        name,
        dept
      }
    })

    return NextResponse.json({ message: 'ลงทะเบียนสำเร็จ' }, { status: 201 })
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
