import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// ฟังก์ชันตรวจสอบว่าผู้ใช้เป็น admin หรือไม่ผ่าน API
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('token')?.value
    console.log('🔧 TOKEN:', token ? 'EXISTS' : 'NOT_FOUND')
    
    if (!token) {
      return false
    }

    // เรียก API เพื่อตรวจสอบ admin แทนการ verify token ใน middleware
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/me`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('🔧 USER DATA:', { role: data.role, username: data.username })
      
      if (data.role === 'admin') {
        return true
      }
    } else {
      console.log('🔧 API ME RESPONSE:', response.status)
    }

    return false
  } catch (error) {
    console.error('🔧 ADMIN CHECK ERROR:', error)
    return false
  }
}

// ฟังก์ชันดึงข้อมูลเวลาทำงานผ่าน API
async function getWorkingHours(request: NextRequest): Promise<{startHour: number, endHour: number, isEnabled: boolean}> {
  try {
    // สร้าง URL สำหรับ API call
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/admin/working-hours`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.data) {
        return {
          startHour: data.data.startHour,
          endHour: data.data.endHour,
          isEnabled: data.data.isEnabled
        }
      }
    }
  } catch (error) {
    console.error('Error fetching working hours from API:', error)
  }

  // ถ้าไม่มีข้อมูลหรือเกิดข้อผิดพลาด ใช้ค่าเริ่มต้น
  return {
    startHour: 6,
    endHour: 16,
    isEnabled: true
  }
}

// ฟังก์ชันตรวจสอบสถานะ maintenance mode ผ่าน API
async function getMaintenanceMode(request: NextRequest): Promise<{isEnabled: boolean, title: string, message: string, startTime?: Date, endTime?: Date}> {
  try {
    // สร้าง URL สำหรับ API call
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/maintenance-status`)

    if (response.ok) {
      const data = await response.json()
      if (data.maintenanceMode) {
        return {
          isEnabled: data.maintenanceMode.isEnabled,
          title: data.maintenanceMode.title,
          message: data.maintenanceMode.message,
          startTime: data.maintenanceMode.startTime ? new Date(data.maintenanceMode.startTime) : undefined,
          endTime: data.maintenanceMode.endTime ? new Date(data.maintenanceMode.endTime) : undefined
        }
      }
    }
  } catch (error) {
    console.error('Error fetching maintenance mode from API:', error)
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
  
  console.log('🔧 MIDDLEWARE:', pathname)
  
  // ไม่ตรวจสอบเวลาสำหรับหน้า maintenance, admin, และ static files
  if (
    pathname === '/maintenance' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files เช่น .css, .js, .png
  ) {
    console.log('🔧 SKIPPING:', pathname)
    return NextResponse.next()
  }
  
  try {
    // ตรวจสอบว่าเป็น admin หรือไม่ก่อนเป็นอันดับแรก
    const userIsAdmin = await isAdmin(request)
    console.log('🔧 IS ADMIN:', userIsAdmin)
    
    // ถ้าเป็น admin ให้ผ่านได้ทุกหน้าเสมอ (ไม่ต้องตรวจสอบอะไรเพิ่ม)
    if (userIsAdmin) {
      console.log('🔧 ADMIN FULL ACCESS - BYPASSING ALL RESTRICTIONS')
      return NextResponse.next()
    }
    
    // สำหรับ user ทั่วไป ตรวจสอบ maintenance mode ก่อน
    const maintenanceMode = await getMaintenanceMode(request)
    console.log('🔧 MAINTENANCE MODE:', maintenanceMode.isEnabled)
    
    if (maintenanceMode.isEnabled) {
      // สำหรับ user ทั่วไป ให้ redirect ไปหน้า maintenance ทันที
      console.log('🔧 REDIRECTING TO MAINTENANCE (MAINTENANCE MODE)')
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
    
    // สำหรับ user ทั่วไป ตรวจสอบเวลาทำงานจากฐานข้อมูล
    const workingHours = await getWorkingHours(request)
    const withinWorkingHours = isWithinAllowedTime(workingHours.startHour, workingHours.endHour, workingHours.isEnabled)
    
    console.log('🔧 WORKING HOURS:', workingHours, 'WITHIN:', withinWorkingHours)
    
    if (!withinWorkingHours) {
      // ถ้าอยู่นอกเวลาที่อนุญาต ให้ redirect ไปหน้า maintenance
      console.log('🔧 REDIRECTING TO MAINTENANCE (OUTSIDE WORKING HOURS)')
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
    
    console.log('🔧 ALLOWING ACCESS')
    return NextResponse.next()
  } catch (error) {
    console.error('🔧 MIDDLEWARE ERROR:', error)
    // ถ้าเกิดข้อผิดพลาด ให้ redirect ไปหน้า maintenance เพื่อความปลอดภัย
    // แต่ถ้าเป็น admin ให้ผ่านได้
    try {
      const userIsAdmin = await isAdmin(request)
      if (userIsAdmin) {
        console.log('🔧 ADMIN BYPASS ERROR FALLBACK')
        return NextResponse.next()
      }
    } catch (adminCheckError) {
      console.error('🔧 ADMIN CHECK ERROR:', adminCheckError)
    }
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
