import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@/generated/prisma'

// สร้าง Prisma client สำหรับ middleware
const prisma = new PrismaClient()

// ฟังก์ชันตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return false
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // ตรวจสอบ role จาก token (ถ้ามีข้อมูลใน token)
    if (decoded.role === 'admin') {
      return true
    }

    return false
  } catch (error) {
    return false
  }
}

// ฟังก์ชันดึงข้อมูลเวลาทำงานจากฐานข้อมูล
async function getWorkingHours(): Promise<{startHour: number, endHour: number, isEnabled: boolean}> {
  try {
    const workingHours = await prisma.workingHours.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (workingHours) {
      return {
        startHour: workingHours.startHour,
        endHour: workingHours.endHour,
        isEnabled: workingHours.isEnabled
      }
    }
  } catch (error) {
    console.error('Error fetching working hours from database:', error)
  }

  // ถ้าไม่มีข้อมูลหรือเกิดข้อผิดพลาด ใช้ค่าเริ่มต้น
  return {
    startHour: 6,
    endHour: 16,
    isEnabled: true
  }
}

// ฟังก์ชันตรวจสอบสถานะ maintenance mode
async function getMaintenanceMode(): Promise<{isEnabled: boolean, title: string, message: string, startTime?: Date, endTime?: Date}> {
  try {
    const maintenanceMode = await prisma.maintenanceMode.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (maintenanceMode) {
      return {
        isEnabled: maintenanceMode.isEnabled,
        title: maintenanceMode.title,
        message: maintenanceMode.message,
        startTime: maintenanceMode.startTime || undefined,
        endTime: maintenanceMode.endTime || undefined
      }
    }
  } catch (error) {
    console.error('Error fetching maintenance mode from database:', error)
  }

  // ถ้าไม่มีข้อมูลหรือเกิดข้อผิดพลาด ใช้ค่าเริ่มต้น (ปิด maintenance mode)
  return {
    isEnabled: false,
    title: "ระบบอยู่ในช่วงปรับปรุง",
    message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง"
  }
}

// ฟังก์ชันตรวจสอบว่าอยู่ในเวลาที่อนุญาตหรือไม่
function isWithinAllowedTime(startHour: number, endHour: number, isEnabled: boolean): boolean {
  // ถ้าปิดการจำกัดเวลา ให้เข้าได้ตลอด
  if (!isEnabled) {
    return true
  }

  // สร้าง Date object สำหรับเวลาปัจจุบันในเขตเวลาไทย (UTC+7)
  const now = new Date()
  const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}))
  
  const currentHour = thailandTime.getHours()
  
  // อนุญาตให้เข้าใช้งานได้ตั้งแต่ startHour ถึง endHour-1
  return currentHour >= startHour && currentHour < endHour
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // ไม่ตรวจสอบเวลาสำหรับหน้า maintenance และ static files
  if (
    pathname === '/maintenance' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files เช่น .css, .js, .png
  ) {
    return NextResponse.next()
  }
  
  try {
    // ตรวจสอบว่าเป็น admin หรือไม่
    const userIsAdmin = await isAdmin(request)
    
    // ตรวจสอบ maintenance mode ก่อน (มีความสำคัญสูงสุด)
    const maintenanceMode = await getMaintenanceMode()
    
    if (maintenanceMode.isEnabled) {
      // ถ้าเป็น admin ให้ผ่านได้แม้ในช่วง maintenance
      if (userIsAdmin) {
        return NextResponse.next()
      }
      
      // สำหรับ user ทั่วไป ให้ redirect ไปหน้า maintenance ทันที
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
    
    // ถ้าเป็น admin ให้ผ่านได้เสมอ (กรณีไม่ได้อยู่ใน maintenance mode)
    if (userIsAdmin) {
      return NextResponse.next()
    }
    
    // สำหรับ user ทั่วไป ตรวจสอบเวลาทำงานจากฐานข้อมูล
    const workingHours = await getWorkingHours()
    const withinWorkingHours = isWithinAllowedTime(workingHours.startHour, workingHours.endHour, workingHours.isEnabled)
    
    if (!withinWorkingHours) {
      // ถ้าอยู่นอกเวลาที่อนุญาต ให้ redirect ไปหน้า maintenance
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
    
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // ถ้าเกิดข้อผิดพลาด ให้ redirect ไปหน้า maintenance เพื่อความปลอดภัย
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - maintenance (maintenance page itself)
     */
    '/((?!api|_next|favicon.ico|maintenance).*)',
  ],
}
