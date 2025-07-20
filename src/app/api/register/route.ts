import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
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

  // ✅ สร้าง username อัตโนมัติสำหรับบุคลากรอื่น
  const username = studentId || `${name.replace(/\s/g, '')}-${Date.now()}`
  const studentID = "user"

  // ✅ บันทึกผู้ใช้ใหม่
  await prisma.user.create({
    data: {
      username,
      student_id: studentId || null,
      status,
      role: 'user',
      name,
      dept,
      ...(status === 'นิสิต' && { student_id: studentId }),
    }
  })

  return NextResponse.json({ message: 'ลงทะเบียนสำเร็จ' }, { status: 201 })
}