import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()

async function getBoothsHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // Pagination parameters
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const skip = (page - 1) * limit
  
  // Filter parameters
  const search = searchParams.get('search') || ''
  const deptType = searchParams.get('dept_type') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // Build where clause
  const where: any = {}
  
  if (search) {
    where.OR = [
      { booth_name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { booth_code: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  if (deptType) {
    where.dept_type = deptType
  }

  // Build orderBy clause
  const orderBy: any = {}
  if (sortBy === 'participants') {
    orderBy.joinedUsers = { _count: sortOrder }
  } else if (sortBy === 'rating') {
    orderBy.ratings = { _count: sortOrder }
  } else {
    orderBy[sortBy] = sortOrder
  }

  try {
    // Get booths with pagination
    const [booths, totalCount] = await Promise.all([
      prisma.booth.findMany({
        where,
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
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.booth.count({ where })
    ])

    // Calculate average ratings
    const boothsWithStats = booths.map(booth => {
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
        }
      }
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      booths: boothsWithStats,
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
    console.error('Error fetching booths:', error)
    throw error
  }
}

export const GET = withRateLimit(apiRateLimit, withErrorHandler(getBoothsHandler))
