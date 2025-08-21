import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

// GET - ดึงข้อมูลสถานะ maintenance mode และ working hours (สำหรับการแสดงผลในหน้า maintenance)
export async function GET(request: NextRequest) {
  try {
    // ดึงข้อมูล maintenance mode
    const maintenanceMode = await prisma.maintenanceMode.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // ดึงข้อมูล working hours
    const workingHours = await prisma.workingHours.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    const maintenanceData = maintenanceMode ? {
      isEnabled: maintenanceMode.isEnabled,
      title: maintenanceMode.title,
      message: maintenanceMode.message,
      startTime: maintenanceMode.startTime,
      endTime: maintenanceMode.endTime
    } : {
      isEnabled: false,
      title: "ระบบอยู่ในช่วงปรับปรุง",
      message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
      startTime: null,
      endTime: null
    }

    const workingHoursData = workingHours ? {
      startHour: workingHours.startHour,
      endHour: workingHours.endHour,
      isEnabled: workingHours.isEnabled
    } : {
      startHour: 6,
      endHour: 16,
      isEnabled: true
    }

    return NextResponse.json({
      maintenance: maintenanceData,
      workingHours: workingHoursData
    })

  } catch (error) {
    console.error('Error fetching maintenance status:', error)
    
    // ส่งค่าเริ่มต้นถ้าเกิดข้อผิดพลาด
    return NextResponse.json({
      maintenance: {
        isEnabled: false,
        title: "ระบบอยู่ในช่วงปรับปรุง",
        message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
        startTime: null,
        endTime: null
      },
      workingHours: {
        startHour: 6,
        endHour: 16,
        isEnabled: true
      }
    })
  }
}
