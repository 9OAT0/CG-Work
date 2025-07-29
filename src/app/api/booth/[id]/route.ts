import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { withErrorHandler, NotFoundError, AuthenticationError, AuthorizationError } from '@/lib/middleware/errorHandler'
import { validateRequest, updateBoothSchema } from '@/lib/validation/schemas'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

async function getBoothHandler(req: NextRequest) {
  const urlParts = req.nextUrl.pathname.split('/')
  const boothId = urlParts[urlParts.length - 1]

  if (!boothId) {
    throw new NotFoundError('Missing booth ID')
  }

  const booth = await prisma.booth.findUnique({
    where: { id: boothId },
    include: {
      ratings: {
        include: {
          user: {
            select: { name: true }
          }
        }
      },
      comments: {
        include: {
          user: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      boothOwners: {
        include: {
          user: {
            select: { name: true }
          }
        }
      },
      _count: {
        select: {
          joinedUsers: true,
          ratings: true,
          favorites: true
        }
      }
    }
  })

  if (!booth) {
    throw new NotFoundError('Booth not found')
  }

  // Calculate average rating
  const avgRating = booth.ratings.length > 0 
    ? booth.ratings.reduce((sum, r) => sum + r.rating, 0) / booth.ratings.length 
    : 0

  return NextResponse.json({
    id: booth.id,
    booth_name: booth.booth_name,
    booth_code: booth.booth_code,
    dept_type: booth.dept_type,
    description: booth.description,
    pics: booth.pics,
    owners: booth.boothOwners.map(owner => ({
      id: owner.user.name,
      name: owner.user.name
    })),
    stats: {
      participants: booth._count.joinedUsers,
      ratings: booth._count.ratings,
      favorites: booth._count.favorites,
      averageRating: Math.round(avgRating * 10) / 10
    },
    ratings: booth.ratings.map(rating => ({
      id: rating.id,
      rating: rating.rating,
      comment: rating.comment,
      userName: rating.user.name,
      createdAt: rating.createdAt
    })),
    comments: booth.comments.map(comment => ({
      id: comment.id,
      comment: comment.comment,
      userName: comment.user.name,
      createdAt: comment.createdAt
    }))
  })
}

async function updateBoothHandler(req: NextRequest) {
  const urlParts = req.nextUrl.pathname.split('/')
  const boothId = urlParts[urlParts.length - 1]

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
    payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string }
  } catch {
    throw new AuthenticationError('Invalid token')
  }

  // Check if user is owner or admin
  const booth = await prisma.booth.findUnique({
    where: { id: boothId },
    include: {
      boothOwners: true
    }
  })

  if (!booth) {
    throw new NotFoundError('Booth not found')
  }

  const isOwner = booth.boothOwners.some(owner => owner.userId === payload.id)
  const isAdmin = payload.role === 'admin'

  if (!isOwner && !isAdmin) {
    throw new AuthorizationError('You are not authorized to update this booth')
  }

  // Validate request body
  const body = await req.json()
  const validatedData = validateRequest(updateBoothSchema, body)

  // Update booth
  const updatedBooth = await prisma.booth.update({
    where: { id: boothId },
    data: validatedData
  })

  return NextResponse.json({
    message: 'อัปเดตบูธสำเร็จ',
    booth: {
      id: updatedBooth.id,
      booth_name: updatedBooth.booth_name,
      booth_code: updatedBooth.booth_code,
      dept_type: updatedBooth.dept_type,
      description: updatedBooth.description,
      pics: updatedBooth.pics
    }
  })
}

async function deleteBoothHandler(req: NextRequest) {
  const urlParts = req.nextUrl.pathname.split('/')
  const boothId = urlParts[urlParts.length - 1]

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
    payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string }
  } catch {
    throw new AuthenticationError('Invalid token')
  }

  // Check if user is owner or admin
  const booth = await prisma.booth.findUnique({
    where: { id: boothId },
    include: {
      boothOwners: true
    }
  })

  if (!booth) {
    throw new NotFoundError('Booth not found')
  }

  const isOwner = booth.boothOwners.some(owner => owner.userId === payload.id)
  const isAdmin = payload.role === 'admin'

  if (!isOwner && !isAdmin) {
    throw new AuthorizationError('You are not authorized to delete this booth')
  }

  // Delete related records first
  await prisma.$transaction([
    prisma.boothJoin.deleteMany({ where: { boothId } }),
    prisma.boothOwner.deleteMany({ where: { boothId } }),
    prisma.boothRating.deleteMany({ where: { boothId } }),
    prisma.boothComment.deleteMany({ where: { boothId } }),
    prisma.boothFavorite.deleteMany({ where: { boothId } }),
    prisma.booth.delete({ where: { id: boothId } })
  ])

  return NextResponse.json({
    message: 'ลบบูธสำเร็จ'
  })
}

export const GET = withRateLimit(apiRateLimit, withErrorHandler(getBoothHandler))
export const PUT = withRateLimit(apiRateLimit, withErrorHandler(updateBoothHandler))
export const DELETE = withRateLimit(apiRateLimit, withErrorHandler(deleteBoothHandler))
