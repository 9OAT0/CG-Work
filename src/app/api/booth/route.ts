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

  try {
    // Get booths with basic info only
    const [booths, totalCount] = await Promise.all([
      prisma.booth.findMany({
        where,
        select: {
          id: true,
          booth_name: true,
          booth_code: true,
          dept_type: true,
          description: true,
          pics: true,
          owner_names: true
        },
        orderBy: { booth_name: 'asc' },
        skip,
        take: limit
      }),
      prisma.booth.count({ where })
    ])

    // Format response
    const boothsWithStats = booths.map(booth => ({
      id: booth.id,
      booth_name: booth.booth_name,
      booth_code: booth.booth_code,
      dept_type: booth.dept_type,
      description: booth.description,
      pics: booth.pics,
      owners: booth.owner_names?.map(name => ({ name })) || [],
      stats: {
        participants: 0,
        ratings: 0,
        favorites: 0,
        averageRating: 0
      }
    }))

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
