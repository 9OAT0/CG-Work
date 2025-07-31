import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()

async function getLeaderboardHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // Pagination parameters
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const skip = (page - 1) * limit
  
  // Filter parameters
  const dept = searchParams.get('dept') || ''
  const period = searchParams.get('period') || 'all' // all, 7d, 30d

  // Calculate date range for period filter
  let startDate: Date | undefined
  if (period !== 'all') {
    const days = period === '7d' ? 7 : 30
    startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
  }

  try {
    // Build where clause
    const where: any = {}
    if (dept) {
      where.dept = dept
    }

    // Get users with their statistics
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          dept: true,
          score: true,
          student_id: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              joinedBooths: true,
              boothRatings: true,
              TranscriptLog: true
            }
          },
          joinedBooths: startDate ? {
            where: {
              joinedAt: {
                gte: startDate
              }
            }
          } : true
        },
        orderBy: { score: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    // Process leaderboard data
    const leaderboard = users.map((user, index) => {
      const participationsInPeriod = Array.isArray(user.joinedBooths) 
        ? user.joinedBooths.length 
        : user._count.joinedBooths

      return {
        rank: skip + index + 1,
        id: user.id,
        name: user.name,
        dept: user.dept,
        score: user.score,
        student_id: user.student_id,
        status: user.status,
        stats: {
          totalParticipations: user._count.joinedBooths,
          participationsInPeriod,
          ratingsGiven: user._count.boothRatings,
          transcriptsReceived: user._count.TranscriptLog
        },
        joinedAt: user.createdAt
      }
    })

    // Get department statistics for context
    const deptStats = await prisma.user.groupBy({
      by: ['dept'],
      _count: true,
      _avg: {
        score: true
      },
      orderBy: {
        _avg: {
          score: 'desc'
        }
      }
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      leaderboard,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      departmentStats: deptStats.map(dept => ({
        department: dept.dept,
        userCount: dept._count,
        averageScore: Math.round((dept._avg.score || 0) * 10) / 10
      })),
      filters: {
        period,
        department: dept || 'all'
      }
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    throw error
  }
}

export const GET = withRateLimit(apiRateLimit, withErrorHandler(getLeaderboardHandler))
