import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verify } from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded: any = verify(token, JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        joinedBooths: true,
        TranscriptLog: true // 🆕 ต้องมี model TranscriptLog ใน DB
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 })
    }

    // 🏆 คำนวณคะแนน
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const dailyPoints = user.joinedBooths.filter(join =>
      join.joinedAt.toISOString().startsWith(today)
    ).length  // สมมุติ 1 booth = 10 คะแนน

    const totalPoints = user.joinedBooths.length

    return NextResponse.json({
      name: user.name,
      student_id: user.student_id,
      status: user.status,
      dept: user.dept,
      dailyPoints,
      dailyMax: 30,  // สมมติเต็มวันละ 30
      totalPoints,
      totalMax: 90,  // สมมติเต็มเดือนละ 90
      transcriptDates: user.TranscriptLog.map(log =>
        log.date.toISOString().split('T')[0]
      )
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}