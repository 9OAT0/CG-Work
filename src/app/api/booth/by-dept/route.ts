import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dept_type = searchParams.get('dept_type')

  if (!dept_type) {
    return NextResponse.json({ error: 'กรุณาระบุ query parameter: dept_type' }, { status: 400 })
  }

  // ✅ ดึง userId จาก token ถ้ามี
  const token = req.cookies.get('token')?.value
  let userId: string | null = null
  if (token) {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET)
      userId = decoded.id
    } catch {
      userId = null // token ไม่ถูกต้อง → ถือว่าไม่ login
    }
  }

  // ✅ ดึง booth ทั้งหมดในหมวดหมู่
  const booths = await prisma.booth.findMany({
    where: { dept_type },
    include: {
      joinedUsers: userId ? {
        where: { userId }
      } : false // ถ้า login ตรวจสอบ joinedUsers เฉพาะ user นี้
    }
  })

  if (booths.length === 0) {
    return NextResponse.json({ message: 'ไม่พบ booth ในหมวดหมู่ที่ระบุ', count: 0 }, { status: 404 })
  }

  // ✅ เพิ่ม field joined สำหรับแต่ละ booth
  const boothWithJoinStatus = booths.map(booth => ({
    id: booth.id,
    booth_name: booth.booth_name,
    dept_type: booth.dept_type,
    description: booth.description,
    pics: booth.pics,
    booth_code: booth.booth_code,
    owner_names: booth.owner_names,
    joined: booth.joinedUsers && booth.joinedUsers.length > 0
  }))

  return NextResponse.json({
    count: boothWithJoinStatus.length,
    booths: boothWithJoinStatus
  })
}

//request example
//GET /api/booth/by-dept?dept_type=3D
