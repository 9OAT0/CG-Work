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

  // First, get the user basic info
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: {
      TranscriptLog: true
    }
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Get existing booth IDs first
  const existingBoothIds = await prisma.booth.findMany({
    select: { id: true }
  }).then(booths => booths.map(b => b.id))

  // Get booth joins without include, then fetch booth data separately
  const allBoothJoins = await prisma.boothJoin.findMany({
    where: {
      userId: payload.id,
      boothId: { in: existingBoothIds }
    },
    orderBy: { joinedAt: 'desc' },
    take: 10
  })

  // Get booth data for the valid joins
  const boothIds = allBoothJoins.map(join => join.boothId)
  const booths = await prisma.booth.findMany({
    where: { id: { in: boothIds } },
    select: {
      id: true,
      booth_name: true,
      dept_type: true
    }
  })

  // Create a map for quick booth lookup
  const boothMap = new Map(booths.map(booth => [booth.id, booth]))

  // Get counts for valid records only
  const [boothJoinCount, boothRatingCount, boothFavoriteCount] = await Promise.all([
    prisma.boothJoin.count({
      where: {
        userId: payload.id,
        boothId: { in: existingBoothIds }
      }
    }),
    prisma.boothRating.count({
      where: {
        userId: payload.id,
        boothId: { in: existingBoothIds }
      }
    }),
    prisma.boothFavorite.count({
      where: {
        userId: payload.id,
        boothId: { in: existingBoothIds }
      }
    })
  ])

  // Calculate recent activity
  const recentActivity = allBoothJoins.map(join => {
    const booth = boothMap.get(join.boothId)
    return {
      type: 'join_booth',
      boothName: booth?.booth_name || 'Unknown Booth',
      deptType: booth?.dept_type || 'Unknown Department',
      timestamp: join.joinedAt
    }
  })

  // Calculate daily points (today's booth joins)
  const today = new Date().toISOString().split('T')[0]
  const dailyJoins = allBoothJoins.filter(join =>
    join.joinedAt.toISOString().startsWith(today)
  ).length

  // Get transcript dates
  const transcriptDates = user.TranscriptLog.map(log => 
    log.date.toISOString().split('T')[0]
  )

  return NextResponse.json({
    name: user.name,
    student_id: user.student_id,
    status: user.status,
    dept: user.dept,
    dailyPoints: dailyJoins,
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
