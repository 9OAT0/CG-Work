import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

// ฟังก์ชันตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
function isAdmin(request: NextRequest): boolean {
  try {
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return false
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return decoded.role === 'admin'
  } catch (error) {
    return false
  }
}

// GET - ดึงข้อมูล maintenance mode ปัจจุบัน
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const maintenanceMode = await prisma.maintenanceMode.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!maintenanceMode) {
      // ถ้าไม่มีข้อมูล ส่งค่าเริ่มต้น
      return NextResponse.json({
        isEnabled: false,
        title: "ระบบอยู่ในช่วงปรับปรุง",
        message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
        startTime: null,
        endTime: null
      })
    }

    return NextResponse.json({
      isEnabled: maintenanceMode.isEnabled,
      title: maintenanceMode.title,
      message: maintenanceMode.message,
      startTime: maintenanceMode.startTime,
      endTime: maintenanceMode.endTime,
      updatedAt: maintenanceMode.updatedAt
    })

  } catch (error) {
    console.error('Error fetching maintenance mode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - อัปเดตการตั้งค่า maintenance mode
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isEnabled, title, message, startTime, endTime } = body

    // ตรวจสอบข้อมูลที่จำเป็น
    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json({ error: 'isEnabled is required and must be boolean' }, { status: 400 })
    }

    // ดึง user ID จาก token
    const token = request.cookies.get('token')?.value
    const decoded = jwt.verify(token!, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    // สร้างข้อมูล maintenance mode ใหม่
    const maintenanceMode = await prisma.maintenanceMode.create({
      data: {
        isEnabled,
        title: title || "ระบบอยู่ในช่วงปรับปรุง",
        message: message || "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        updatedBy: userId,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        isEnabled: maintenanceMode.isEnabled,
        title: maintenanceMode.title,
        message: maintenanceMode.message,
        startTime: maintenanceMode.startTime,
        endTime: maintenanceMode.endTime,
        updatedAt: maintenanceMode.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating maintenance mode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - อัปเดตการตั้งค่า maintenance mode (เหมือน POST แต่ใช้สำหรับการแก้ไข)
export async function PUT(request: NextRequest) {
  return POST(request)
}
