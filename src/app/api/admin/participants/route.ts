import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyAdmin } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req)
  
  if (auth instanceof NextResponse) return auth

  const visitLogs = await prisma.visitLog.groupBy({
    by: ['visitedAt'],
    _count: true
  })

  const data = visitLogs.map(log => ({
    date: log.visitedAt.toISOString().split('T')[0],
    count: log._count
  }))

  const total = data.reduce((sum, item) => sum + item.count, 0)

  return NextResponse.json({ data, total })
}