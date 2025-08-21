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

// ฟังก์ชันตรวจสอบว่า user login วันนี้หรือยัง
async function checkDailyLogin(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return false
    }

    // เรียก API เพื่อตรวจสอบ daily login
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/me`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    })

    if (response.ok) {
      const data = await response.json()
      
      // ตรวจสอบว่า lastLoginDate เป็นวันนี้หรือไม่
      if (data.lastLoginDate) {
        const lastLogin = new Date(data.lastLoginDate)
        const today = new Date()
        const thailandToday = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}))
        
        // เปรียบเทียบวันที่ (ไม่รวมเวลา)
        const lastLoginDate = lastLogin.toDateString()
        const todayDate = thailandToday.toDateString()
        
        return lastLoginDate === todayDate
      }
    }

    return false
  } catch (error) {
    console.error('🔧 DAILY LOGIN CHECK ERROR:', error)
    return false
  }
}

// ฟังก์ชัน force logout user ในช่วง maintenance
async function forceLogoutUser(request: NextRequest): Promise<void> {
  try {
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return
    }

    // เรียก API เพื่อ mark user ว่าถูก force logout
    const baseUrl = request.nextUrl.origin
    await fetch(`${baseUrl}/api/maintenance/force-logout`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('🔧 FORCE LOGOUT ERROR:', error)
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('🔧 MIDDLEWARE:', pathname)
  
  // ไม่ตรวจสอบเวลาสำหรับหน้า maintenance, admin, login, register และ static files
  if (
    pathname === '/maintenance' ||
    pathname === '/login' ||
    pathname === '/register' ||
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
    
    // สำหรับ user ทั่วไป ตรวจสอบ daily login ก่อน (ยกเว้นหน้า login และ register)
    if (pathname !== '/login' && pathname !== '/register') {
      const hasValidDailyLogin = await checkDailyLogin(request)
      console.log('🔧 DAILY LOGIN VALID:', hasValidDailyLogin)
      
      if (!hasValidDailyLogin) {
        // ถ้าไม่ได้ login วันนี้ ให้ force logout และ redirect ไป login
        console.log('🔧 REDIRECTING TO LOGIN (NO DAILY LOGIN)')
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('token') // ลบ token cookie
        return response
      }
    }
    
    // ตรวจสอบ maintenance mode
    const maintenanceMode = await getMaintenanceMode(request)
    console.log('🔧 MAINTENANCE MODE:', maintenanceMode.isEnabled)
    
    if (maintenanceMode.isEnabled) {
      // Force logout user ที่ไม่ใช่ admin และ redirect ไป maintenance
      console.log('🔧 FORCE LOGOUT AND REDIRECT TO MAINTENANCE')
      const response = NextResponse.redirect(new URL('/maintenance', request.url))
      response.cookies.delete('token') // ลบ token cookie
      // อัพเดท maintenanceLoggedOut flag ผ่าน API call
      await forceLogoutUser(request)
      return response
    }
    
    // ตรวจสอบเวลาทำงาน
    const workingHours = await getWorkingHours(request)
    const withinWorkingHours = isWithinAllowedTime(workingHours.startHour, workingHours.endHour, workingHours.isEnabled)
    
    console.log('🔧 WORKING HOURS:', workingHours, 'WITHIN:', withinWorkingHours)
    
    if (!withinWorkingHours) {
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
