import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
  const { student_id, name } = await req.json()

  if (!student_id || !name) {
    return NextResponse.json({ error: 'กรุณากรอก รหัสนิสิต และ ชื่อ-นามสกุล' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { student_id, name }
  })

  if (!user) {
    return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 })
  }

  const token = jwt.sign(
    { id: user.id, student_id: user.student_id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  const res = NextResponse.json({ message: 'เข้าสู่ระบบสำเร็จ', user })
  res.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })

  return res
}