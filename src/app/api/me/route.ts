import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: {
      joinedBooths: {
        include: {
          booth: true
        }
      }
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // แปลงข้อมูลให้เหมาะกับ frontend
  const result = {
    id: user.id,
    username: user.username,
    name: user.name,
    student_id: user.student_id,
    year: user.year,
    dept: user.dept,
    role: user.role,
    joinedBooths: user.joinedBooths.map((join) => ({
      booth_id: join.booth.id,
      booth_name: join.booth.booth_name,
      dept_type: join.booth.dept_type,
      joinedAt: join.joinedAt
    }))
  }

  return NextResponse.json(result)
}