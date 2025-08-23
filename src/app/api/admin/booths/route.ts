import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { verify } from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded: any = verify(token, JWT_SECRET)
    const me = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const booths = await prisma.booth.findMany({
      select: { id: true, booth_name: true, booth_code: true, dept_type: true },
      orderBy: { booth_name: 'asc' }
    })
    return NextResponse.json({ data: booths })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
