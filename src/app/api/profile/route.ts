import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { withErrorHandler, AuthenticationError, NotFoundError } from '@/lib/middleware/errorHandler'
import { validateRequest, updateProfileSchema } from '@/lib/validation/schemas'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

// Use singleton pattern for Prisma client to avoid connection issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const JWT_SECRET = process.env.JWT_SECRET!

async function getProfileHandler(req: NextRequest) {
  // Verify authentication
  const token = req.cookies.get('token')?.value
  if (!token) {
    throw new AuthenticationError('Unauthorized')
  }

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string }
  } catch {
    throw new AuthenticationError('Invalid token')
  }

  // Get user with transcript logs in a single query
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      name: true,
      student_id: true,
      status: true,
      dept: true,
      score: true,
      TranscriptLog: {
        select: {
          date: true
        }
      }
    }
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Calculate daily points efficiently with a single query
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dailyJoinsCount = await prisma.boothJoin.count({
    where: {
      userId: payload.id,
      joinedAt: {
        gte: today,
        lt: tomorrow
      },
      booth: {
        id: { not: undefined } // Only count joins to existing booths
      }
    }
  })

  // Get transcript dates
  const transcriptDates = user.TranscriptLog.map(log => 
    log.date.toISOString().split('T')[0]
  )

  return NextResponse.json({
    name: user.name,
    student_id: user.student_id,
    status: user.status,
    dept: user.dept,
    dailyPoints: dailyJoinsCount,
    totalPoints: user.score,
    transcriptDates
  })
}

async function updateProfileHandler(req: NextRequest) {
  // Verify authentication
  const token = req.cookies.get('token')?.value
  if (!token) {
    throw new AuthenticationError('Unauthorized')
  }

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string }
  } catch {
    throw new AuthenticationError('Invalid token')
  }

  // Validate request body
  const body = await req.json()
  const validatedData = validateRequest(updateProfileSchema, body)

  // Update user profile
  const updatedUser = await prisma.user.update({
    where: { id: payload.id },
    data: validatedData,
    select: {
      id: true,
      name: true,
      dept: true,
      year: true
    }
  })

  return NextResponse.json({
    message: 'อัปเดตโปรไฟล์สำเร็จ',
    user: updatedUser
  })
}

export const GET = withRateLimit(apiRateLimit, withErrorHandler(getProfileHandler))
export const PUT = withRateLimit(apiRateLimit, withErrorHandler(updateProfileHandler))
