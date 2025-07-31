import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { withErrorHandler, NotFoundError, AuthenticationError, ConflictError } from '@/lib/middleware/errorHandler'
import { validateRequest, rateBoothSchema } from '@/lib/validation/schemas'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

async function rateBoothHandler(req: NextRequest) {
  const urlParts = req.nextUrl.pathname.split('/')
  const boothId = urlParts[urlParts.indexOf('booth') + 1]

  if (!boothId) {
    throw new NotFoundError('Missing booth ID')
  }

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

  // Check if booth exists
  const booth = await prisma.booth.findUnique({
    where: { id: boothId }
  })

  if (!booth) {
    throw new NotFoundError('Booth not found')
  }

  // Validate request body
  const body = await req.json()
  const { rating, comment } = validateRequest(rateBoothSchema, body)

  try {
    // Upsert rating (update if exists, create if not)
    const boothRating = await prisma.boothRating.upsert({
      where: {
        userId_boothId: {
          userId: payload.id,
          boothId: boothId
        }
      },
      update: {
        rating,
        comment
      },
      create: {
        userId: payload.id,
        boothId: boothId,
        rating,
        comment
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({
      message: 'ให้คะแนนสำเร็จ',
      rating: {
        id: boothRating.id,
        rating: boothRating.rating,
        comment: boothRating.comment,
        userName: boothRating.user.name,
        createdAt: boothRating.createdAt
      }
    })
  } catch (error) {
    console.error('Rating error:', error)
    throw error
  }
}

async function getRatingsHandler(req: NextRequest) {
  const urlParts = req.nextUrl.pathname.split('/')
  const boothId = urlParts[urlParts.indexOf('booth') + 1]

  if (!boothId) {
    throw new NotFoundError('Missing booth ID')
  }

  const ratings = await prisma.boothRating.findMany({
    where: { boothId },
    include: {
      user: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const avgRating = ratings.length > 0 
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
    : 0

  return NextResponse.json({
    ratings: ratings.map(rating => ({
      id: rating.id,
      rating: rating.rating,
      comment: rating.comment,
      userName: rating.user.name,
      createdAt: rating.createdAt
    })),
    stats: {
      totalRatings: ratings.length,
      averageRating: Math.round(avgRating * 10) / 10
    }
  })
}

export const POST = withRateLimit(apiRateLimit, withErrorHandler(rateBoothHandler))
export const GET = withRateLimit(apiRateLimit, withErrorHandler(getRatingsHandler))
