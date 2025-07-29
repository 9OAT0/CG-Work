import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { withErrorHandler, AuthenticationError } from '@/lib/middleware/errorHandler'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

async function getFavoritesHandler(req: NextRequest) {
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

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const skip = (page - 1) * limit

  try {
    const [favorites, totalCount] = await Promise.all([
      prisma.boothFavorite.findMany({
        where: { userId: payload.id },
        include: {
          booth: {
            include: {
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
              },
              ratings: {
                select: { rating: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.boothFavorite.count({
        where: { userId: payload.id }
      })
    ])

    const favoritedBooths = favorites.map(favorite => {
      const booth = favorite.booth
      const avgRating = booth.ratings.length > 0 
        ? booth.ratings.reduce((sum, r) => sum + r.rating, 0) / booth.ratings.length 
        : 0

      return {
        id: booth.id,
        booth_name: booth.booth_name,
        booth_code: booth.booth_code,
        dept_type: booth.dept_type,
        description: booth.description,
        pics: booth.pics,
        owners: booth.boothOwners.map(owner => ({
          name: owner.user.name
        })),
        stats: {
          participants: booth._count.joinedUsers,
          ratings: booth._count.ratings,
          favorites: booth._count.favorites,
          averageRating: Math.round(avgRating * 10) / 10
        },
        favoritedAt: favorite.createdAt
      }
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      favorites: favoritedBooths,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching favorites:', error)
    throw error
  }
}

export const GET = withRateLimit(apiRateLimit, withErrorHandler(getFavoritesHandler))
