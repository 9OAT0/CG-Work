import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { withErrorHandler, NotFoundError, AuthenticationError } from '@/lib/middleware/errorHandler'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

async function toggleFavoriteHandler(req: NextRequest) {
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

  // Check if already favorited
  const existingFavorite = await prisma.boothFavorite.findUnique({
    where: {
      userId_boothId: {
        userId: payload.id,
        boothId: boothId
      }
    }
  })

  if (existingFavorite) {
    // Remove from favorites
    await prisma.boothFavorite.delete({
      where: { id: existingFavorite.id }
    })

    return NextResponse.json({
      message: 'ลบออกจากรายการโปรดแล้ว',
      isFavorited: false
    })
  } else {
    // Add to favorites
    await prisma.boothFavorite.create({
      data: {
        userId: payload.id,
        boothId: boothId
      }
    })

    return NextResponse.json({
      message: 'เพิ่มเข้ารายการโปรดแล้ว',
      isFavorited: true
    })
  }
}

async function getFavoriteStatusHandler(req: NextRequest) {
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

  const favorite = await prisma.boothFavorite.findUnique({
    where: {
      userId_boothId: {
        userId: payload.id,
        boothId: boothId
      }
    }
  })

  return NextResponse.json({
    isFavorited: !!favorite
  })
}

export const POST = withRateLimit(apiRateLimit, withErrorHandler(toggleFavoriteHandler))
export const GET = withRateLimit(apiRateLimit, withErrorHandler(getFavoriteStatusHandler))
