import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
  const { booth_name, booth_code, dept_type } = await req.json()

  if (!booth_name || !booth_code || !dept_type) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
  }

  // ตรวจสอบ token
  const token = req.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // ตรวจสอบว่ามี booth_code ซ้ำไหม
  const existing = await prisma.booth.findUnique({ where: { booth_code } })
  if (existing) {
    return NextResponse.json({ error: 'booth_code นี้มีอยู่แล้ว' }, { status: 400 })
  }

  // สร้าง booth
  const booth = await prisma.booth.create({
    data: {
      booth_name,
      booth_code,
      dept_type,
      boothOwners: {
        create: {
          user: {
            connect: { id: payload.id }
          }
        }
      }
    }
  })

  return NextResponse.json({ message: 'สร้างบูธสำเร็จ', booth })
}
