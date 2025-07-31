import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { withErrorHandler, AuthenticationError, NotFoundError } from '@/lib/middleware/errorHandler'
import { validateRequest, updateProfileSchema } from '@/lib/validation/schemas'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()
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

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: {
      joinedBooths: {
        include: {
          booth: {
            select: {
              booth_name: true,
              dept_type: true
            }
          }
        },
        orderBy: { joinedAt: 'desc' },
        take: 10
      },
      boothRatings: true,
      boothFavorites: true,
      TranscriptLog: true,
      _count: {
        select: {
          joinedBooths: true,
          boothRatings: true,
          boothFavorites: true,
          TranscriptLog: true
        }
      }
    }
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Calculate recent activity
  const recentActivity = user.joinedBooths.map(join => ({
    type: 'join_booth',
    boothName: join.booth.booth_name,
    deptType: join.booth.dept_type,
    timestamp: join.joinedAt
  }))

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      dept: user.dept,
      score: user.score,
      student_id: user.student_id,
      status: user.status,
      year: user.year,
      role: user.role,
      stats: {
        joinedBooths: user._count.joinedBooths,
        ratingsGiven: user._count.boothRatings,
        transcriptsReceived: user._count.TranscriptLog,
        favoriteBooths: user._count.boothFavorites
      },
      recentActivity,
      createdAt: user.createdAt
    }
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
