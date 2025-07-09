import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
  const { boothCode } = await req.json()

  // ตรวจสอบว่ามี token หรือไม่
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ถอด token
  let userPayload
  try {
    userPayload = jwt.verify(token, JWT_SECRET) as { id: string }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // หา booth จาก booth_code
  const booth = await prisma.booth.findUnique({
    where: { booth_code: boothCode },
  })

  if (!booth) {
    return NextResponse.json({ error: 'Booth code ไม่ถูกต้อง' }, { status: 400 })
  }

  // ตรวจสอบว่า user เคย join แล้วหรือยัง
  const existing = await prisma.boothJoin.findFirst({
    where: {
      userId: userPayload.id,
      boothId: booth.id,
    },
  })

  if (existing) {
    return NextResponse.json({ message: 'คุณได้เข้าร่วม booth นี้แล้ว' }, { status: 200 })
  }

  // สร้าง boothJoin ใหม่
  await prisma.boothJoin.create({
    data: {
      user: { connect: { id: userPayload.id } },
      booth: { connect: { id: booth.id } },
    },
  })

  return NextResponse.json({ message: 'เข้าร่วม booth สำเร็จ' }, { status: 200 })
}