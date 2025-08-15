import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { getThailandTime } from '@/lib/time'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
  try {
    const { status, studentId, name, dept } = await req.json()

    console.log('Registration attempt:', { status, studentId: studentId || 'N/A', name, dept })

    // ✅ ตรวจสอบฟิลด์ที่ต้องกรอก
    if (!status || !name || !dept) {
      console.log('Missing required fields')
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' }, { status: 400 })
    }

    // ✅ ตรวจสอบ studentId เฉพาะนิสิต
    if (status === 'นิสิต') {
      if (!studentId || studentId.trim() === '') {
        console.log('Missing student ID for student registration')
        return NextResponse.json({ 
          error: 'กรุณากรอกรหัสนิสิต สำหรับการลงทะเบียนนิสิต' 
        }, { status: 400 })
      }

      const trimmedStudentId = studentId.trim()
      
      // ตรวจสอบรูปแบบรหัสนิสิต (8 หลัก)
      if (!/^\d{8}$/.test(trimmedStudentId)) {
        console.log('Invalid student ID format:', trimmedStudentId)
        return NextResponse.json({ 
          error: 'รหัสนิสิตต้องเป็นตัวเลข 8 หลัก' 
        }, { status: 400 })
      }
      
      console.log('Checking for existing student ID:', trimmedStudentId)
      
      const existingUser = await prisma.user.findUnique({
        where: { student_id: trimmedStudentId }
      })

      if (existingUser) {
        console.log('Student ID already exists:', trimmedStudentId, 'for user:', existingUser.name)
        return NextResponse.json({ 
          error: `รหัสนิสิต ${trimmedStudentId} ถูกใช้ลงทะเบียนแล้วโดย ${existingUser.name}` 
        }, { status: 409 })
      }
      console.log('Student ID is available:', trimmedStudentId)
    } else {
      // ✅ สำหรับไม่ใช่นิสิต ตรวจสอบชื่อซ้ำในสถานะเดียวกัน
      console.log('Checking for existing name for non-student:', name.trim(), 'status:', status)
      
      const existingUser = await prisma.user.findFirst({
        where: { 
          name: name.trim(),
          status: status, // ตรวจสอบเฉพาะในสถานะเดียวกัน
          student_id: null
        }
      })

      if (existingUser) {
        console.log('Name already exists for same status:', name.trim(), 'status:', existingUser.status)
        return NextResponse.json({ 
          error: `ชื่อ "${name.trim()}" ถูกใช้ลงทะเบียนแล้วในสถานะ ${existingUser.status}` 
        }, { status: 409 })
      }
      console.log('Name is available for status:', status, 'name:', name.trim())
    }

    // ✅ สร้าง username (สามารถซ้ำกันได้)
    const username = (status === 'นิสิต' && studentId) ? studentId : `${name.replace(/\s/g, '')}-${Date.now()}`

    // ✅ บันทึกผู้ใช้ใหม่
    const newUser = await prisma.user.create({
      data: {
        username,
        student_id: status === 'นิสิต' ? studentId.trim() : null, // เก็บ student_id เฉพาะนิสิตเท่านั้น
        status,
        role: 'user',
        name,
        dept
      }
    })

    // ✅ บันทึก visit log สำหรับการเข้าสู่ระบบครั้งแรก
    await prisma.visitLog.create({
      data: {
        userId: newUser.id,
        visitedAt: getThailandTime()
      },
    })

    // ✅ สร้าง JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        student_id: newUser.student_id,
        name: newUser.name,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // ✅ สร้าง response พร้อม set cookie
    const response = NextResponse.json(
      { message: 'ลงทะเบียนและเข้าสู่ระบบสำเร็จ', user: newUser },
      { status: 201 }
    )

    // ✅ Set JWT token ใน cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 วัน
    })

    return response

  } catch (error: any) {
    console.error('Registration error:', error)
    
    // ตรวจสอบ Prisma unique constraint error
    if (error.code === 'P2002') {
      console.log('Unique constraint violation:', error.meta)
      if (error.meta?.target?.includes('student_id')) {
        return NextResponse.json({ error: 'รหัสนิสิตนี้ถูกใช้ลงทะเบียนแล้ว' }, { status: 409 })
      } else if (error.meta?.target?.includes('name')) {
        return NextResponse.json({ error: 'ชื่อนี้ถูกใช้ลงทะเบียนแล้ว' }, { status: 409 })
      } else if (error.meta?.target?.includes('username')) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' }, { status: 409 })
      } else {
        return NextResponse.json({ error: 'ข้อมูลนี้ถูกใช้ลงทะเบียนแล้ว' }, { status: 409 })
      }
    }
    
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง' }, { status: 500 })
  }
}
