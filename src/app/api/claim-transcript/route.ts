import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verify } from 'jsonwebtoken'
import { getThailandTime } from '@/lib/time'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded: any = verify(token, JWT_SECRET)
    const userId = decoded.id

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // ✅ ตรวจสอบว่ารับ transcript วันนี้ไปแล้วหรือยัง
    const alreadyClaimed = await prisma.transcriptLog.findFirst({
      where: {
        userId,
        date: {
          gte: new Date(`${today}T00:00:00Z`),
          lte: new Date(`${today}T23:59:59Z`)
        }
      }
    })

    if (alreadyClaimed) {
      return NextResponse.json({ error: 'คุณรับ transcript วันนี้แล้ว' }, { status: 400 })
    }

    // ✅ ตรวจสอบคะแนนผู้ใช้
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 })
    }

    if (user.score < 6) {
      return NextResponse.json({ error: 'คะแนนไม่เพียงพอในการรับ transcript วันนี้' }, { status: 400 })
    }

    // ✅ บันทึกการรับ transcript
    await prisma.transcriptLog.create({
      data: {
        userId : userId,
        date : getThailandTime() 
       }
    })

    // ✅ หักคะแนน 6
    await prisma.user.update({
      where: { id: userId },
      data: {
        score: { decrement: 6 }
      }
    })

    return NextResponse.json({ message: 'รับ transcript สำเร็จ และหัก 6 คะแนนแล้ว' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}