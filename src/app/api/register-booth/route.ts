import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { booth_name, booth_code, dept_type, description, pics, owner_names } = await req.json()

  if (!booth_name || !booth_code || !dept_type || !description || !owner_names || owner_names.length === 0) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ กรุณากรอกข้อมูลเจ้าของบูธอย่างน้อย 1 คน' }, { status: 400 })
  }

  // ตรวจสอบว่ามี booth_code ซ้ำไหม
  const existing = await prisma.booth.findUnique({ where: { booth_code } })
  if (existing) {
    return NextResponse.json({ error: 'booth_code นี้มีอยู่แล้ว' }, { status: 400 })
  }

  // สร้าง booth โดยไม่ต้องมี authentication
  // เก็บข้อมูลเจ้าของบูธใน description สำหรับตอนนี้
  const ownerInfo = owner_names.length > 0 ? `\n\nเจ้าของบูธ: ${owner_names.join(', ')}` : '';
  
  const booth = await prisma.booth.create({
    data: {
      booth_name,
      booth_code,
      dept_type,
      description: description + ownerInfo,
      pics: pics || [] // Handle pics array, default to empty array if not provided
    }
  })

  return NextResponse.json({ message: 'สร้างบูธสำเร็จ', booth })
}
