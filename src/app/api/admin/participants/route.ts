import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyAdmin } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req)
  if (auth instanceof NextResponse) return auth // 🛑 ถ้าไม่ใช่ admin

  const boothJoins = await prisma.boothJoin.groupBy({
    by: ['joinedAt'],
    _count: true
  })

  const data = boothJoins.map(join => ({
    date: join.joinedAt.toISOString().split('T')[0],
    count: join._count
  }))

  const total = data.reduce((sum, item) => sum + item.count, 0)

  return NextResponse.json({ data, total })
}