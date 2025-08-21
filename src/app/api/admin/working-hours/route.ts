import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// GET - ดึงข้อมูลเวลาทำงานปัจจุบัน
export async function GET() {
  try {
    let workingHours = await prisma.workingHours.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // ถ้าไม่มีข้อมูล ให้สร้างค่าเริ่มต้น
    if (!workingHours) {
      workingHours = await prisma.workingHours.create({
        data: {
          startHour: 6,
          endHour: 16,
          isEnabled: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: workingHours
    })
  } catch (error) {
    console.error('Error fetching working hours:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch working hours' },
      { status: 500 }
    )
  }
}

// POST - อัพเดทเวลาทำงาน (เฉพาะ admin)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ตรวจสอบ JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // ดึงข้อมูลผู้ใช้
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { startHour, endHour, isEnabled } = body

    // ตรวจสอบข้อมูลที่ส่งมา
    if (
      typeof startHour !== 'number' || 
      typeof endHour !== 'number' || 
      typeof isEnabled !== 'boolean' ||
      startHour < 0 || startHour > 23 ||
      endHour < 0 || endHour > 23 ||
      startHour >= endHour
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid working hours data' },
        { status: 400 }
      )
    }

    // สร้างข้อมูลเวลาทำงานใหม่
    const workingHours = await prisma.workingHours.create({
      data: {
        startHour,
        endHour,
        isEnabled,
        updatedBy: user.id,
        updatedAt: new Date()
      },
      include: {
        updatedUser: {
          select: {
            name: true,
            username: true
          }
        }
      }
    })

    // บันทึก log
    await prisma.systemLog.create({
      data: {
        action: 'update_working_hours',
        userId: user.id,
        details: JSON.stringify({
          startHour,
          endHour,
          isEnabled,
          previousSettings: 'updated'
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: workingHours,
      message: 'Working hours updated successfully'
    })
  } catch (error) {
    console.error('Error updating working hours:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update working hours' },
      { status: 500 }
    )
  }
}
