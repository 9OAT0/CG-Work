import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { withErrorHandler, AuthenticationError, ValidationError } from '@/lib/middleware/errorHandler'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

async function verifyBoothHandler(req: NextRequest) {
  // Verify authentication
  const token = req.cookies.get('token')?.value
  if (!token) {
    throw new AuthenticationError('กรุณาเข้าสู่ระบบก่อน')
  }

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string }
  } catch {
    throw new AuthenticationError('Token ไม่ถูกต้อง')
  }

  const body = await req.json()
  const { boothCode } = body

  if (!boothCode) {
    throw new ValidationError('กรุณากรอกรหัสบูธ')
  }

  // Find booth by booth_code
  const booth = await prisma.booth.findUnique({
    where: { booth_code: boothCode },
    select: {
      id: true,
      booth_name: true,
      booth_code: true
    }
  })

  if (!booth) {
    return NextResponse.json(
      { error: 'รหัสบูธไม่ถูกต้อง' },
      { status: 400 }
    )
  }

  // Check if user already joined this booth
  const existingJoin = await prisma.boothJoin.findFirst({
    where: {
      userId: payload.id,
      boothId: booth.id
    }
  })

  if (existingJoin) {
    return NextResponse.json(
      { error: 'คุณได้เข้าร่วมบูธนี้แล้ว' },
      { status: 400 }
    )
  }

  // Add user to booth
  await prisma.boothJoin.create({
    data: {
      userId: payload.id,
      boothId: booth.id
    }
  })

  // Update user score
  await prisma.user.update({
    where: { id: payload.id },
    data: {
      score: {
        increment: 1
      }
    }
  })

  return NextResponse.json({
    message: 'เข้าร่วมบูธสำเร็จ',
    booth: {
      id: booth.id,
      name: booth.booth_name,
      code: booth.booth_code
    }
  })
}

export const POST = withRateLimit(apiRateLimit, withErrorHandler(verifyBoothHandler))
