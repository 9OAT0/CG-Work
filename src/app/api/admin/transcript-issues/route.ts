import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyAdmin } from '@/lib/auth'

const prisma = new PrismaClient()

// 📝 GET: ดึงรายการปัญหา
export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req)
  if (auth instanceof NextResponse) return auth

  const issues = await prisma.transcriptIssue.findMany()
  return NextResponse.json({ issues })
}

// 📝 POST: เพิ่มรายการใหม่
export async function POST(req: NextRequest) {
  const auth = verifyAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { student_id, name, year, dept } = await req.json()
  if (!student_id || !name || !year || !dept) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }

  await prisma.transcriptIssue.create({
    data: { student_id, name, year, dept }
  })

  return NextResponse.json({ message: 'เพิ่มรายชื่อสำเร็จ' })
}
