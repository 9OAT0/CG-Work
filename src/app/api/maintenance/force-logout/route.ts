import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string }
    
    // อัพเดท maintenanceLoggedOut flag
    await prisma.user.update({
      where: { id: decoded.id },
      data: {
        maintenanceLoggedOut: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'User marked as maintenance logged out' 
    })
  } catch (error) {
    console.error('Error in force logout:', error)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
