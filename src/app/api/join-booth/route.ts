import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { getThailandTime } from '@/lib/time'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

// 🎯 คะแนนสูงสุดต่อวัน
const MAX_DAILY_SCORE = 30

export async function POST(req: NextRequest) {
  try {
    const { boothCode } = await req.json()

    if (!boothCode || typeof boothCode !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุ boothCode' }, { status: 400 })
    }

    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: ไม่พบ token' }, { status: 401 })
    }

    let userPayload
    try {
      userPayload = jwt.verify(token, JWT_SECRET) as { id: string }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userPayload.id },
      include: { joinedBooths: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 })
    }

    const booth = await prisma.booth.findUnique({
      where: { booth_code: boothCode }
    })

    if (!booth) {
      return NextResponse.json({ error: 'Booth code ไม่ถูกต้อง' }, { status: 400 })
    }

    // ✅ ตรวจสอบว่าผู้ใช้เคย join booth นี้แล้วหรือยัง
    const existing = await prisma.boothJoin.findFirst({
      where: {
        userId: user.id,
        boothId: booth.id
      }
    })

    if (existing) {
      return NextResponse.json({ message: 'คุณได้เข้าร่วม booth นี้แล้ว' }, { status: 200 })
    }

    // ✅ ตรวจสอบคะแนนวันนี้
    const today = new Date().toISOString().split('T')[0]
    const dailyJoins = user.joinedBooths.filter(join =>
      join.joinedAt.toISOString().startsWith(today)
    ).length

    if (dailyJoins >= MAX_DAILY_SCORE) {
      return NextResponse.json({
        error: `คุณมีคะแนนครบ ${MAX_DAILY_SCORE} คะแนนในวันนี้แล้ว`
      }, { status: 400 })
    }

    // ✅ สร้าง boothJoin ใหม่ และเพิ่มคะแนน
    await prisma.boothJoin.create({
      data: {
        userId: user.id,
        boothId: booth.id,
        joinedAt: getThailandTime()
      }
    })

    await prisma.user.update({
      where: { id: user.id },
      data: {
        score: { increment: 1 }
      }
    })

    return NextResponse.json({
      message: `เข้าร่วม booth สำเร็จ (คะแนนวันนี้: ${dailyJoins + 1}/${MAX_DAILY_SCORE})`
    }, { status: 200 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: 'Internal Server Error', detail: err.message }, { status: 500 })
  }
}