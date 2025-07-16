import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { status, studentId, name, year, dept } = await req.json()

  if (!status || !name || !dept) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }

  if (studentId && typeof studentId === 'string' && studentId.trim() !== '') {
    const existingUser = await prisma.user.findUnique({
      where: { student_id: studentId }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'รหัสนิสิตนี้ลงทะเบียนแล้ว' }, { status: 409 })
    }
  }

  await prisma.user.create({
    data: {
      username: studentId || `${name}-${Date.now()}`,
      student_id: studentId || null,
      status,
      role: 'user',
      year: year || '',
      name,
      dept
    }
  })

  return NextResponse.json({ message: 'ลงทะเบียนสำเร็จ' })
}