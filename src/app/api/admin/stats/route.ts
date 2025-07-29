import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { withErrorHandler, AuthenticationError, AuthorizationError } from '@/lib/middleware/errorHandler'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

async function getStatsHandler(req: NextRequest) {
  // Verify authentication and admin role
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

  if (payload.role !== 'admin') {
    throw new AuthorizationError('Admin access required')
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '7d' // 7d, 30d, 90d, all

  // Calculate date range
  let startDate: Date | undefined
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
  }

  const dateFilter = startDate ? { gte: startDate } : undefined

  try {
    // Get overall statistics
    const [
      totalUsers,
      totalBooths,
      totalParticipations,
      totalRatings,
      totalTranscripts,
      recentUsers,
      recentBooths,
      recentParticipations,
      boothStats,
      userStats,
      deptStats
    ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.booth.count(),
      prisma.boothJoin.count(),
      prisma.boothRating.count(),
      prisma.transcriptLog.count(),

      // Recent activity (based on period)
      prisma.user.count({
        where: dateFilter ? { createdAt: dateFilter } : undefined
      }),
      prisma.booth.count(),
      prisma.boothJoin.count({
        where: { joinedAt: dateFilter }
      }),

      // Booth statistics
      prisma.booth.findMany({
        include: {
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
        orderBy: {
          joinedUsers: {
            _count: 'desc'
          }
        },
        take: 10
      }),

      // Top users by score
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          score: true,
          dept: true,
          _count: {
            select: {
              joinedBooths: true
            }
          }
        },
        orderBy: { score: 'desc' },
        take: 10
      }),

      // Department statistics
      prisma.user.groupBy({
        by: ['dept'],
        _count: true
      })
    ])

    // Process booth statistics
    const topBooths = boothStats.map(booth => {
      const avgRating = booth.ratings.length > 0 
        ? booth.ratings.reduce((sum, r) => sum + r.rating, 0) / booth.ratings.length 
        : 0

      return {
        id: booth.id,
        booth_name: booth.booth_name,
        dept_type: booth.dept_type,
        participants: booth._count.joinedUsers,
        ratings: booth._count.ratings,
        favorites: booth._count.favorites,
        averageRating: Math.round(avgRating * 10) / 10
      }
    })

    // Daily activity for the period
    const dailyActivity = await getDailyActivity(startDate)

    return NextResponse.json({
      overview: {
        totalUsers,
        totalBooths,
        totalParticipations,
        totalRatings,
        totalTranscripts,
        period: {
          newUsers: recentUsers,
          newBooths: recentBooths,
          newParticipations: recentParticipations,
          days: period === 'all' ? 'all' : period
        }
      },
      topBooths,
      topUsers: userStats,
      departmentStats: deptStats.map(dept => ({
        department: dept.dept,
        userCount: dept._count
      })),
      dailyActivity
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    throw error
  }
}

async function getDailyActivity(startDate?: Date) {
  if (!startDate) return []

  const days = []
  const currentDate = new Date(startDate)
  const endDate = new Date()

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const [newUsers, newParticipations, newRatings] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      }),
      prisma.boothJoin.count({
        where: {
          joinedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      }),
      prisma.boothRating.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      })
    ])

    days.push({
      date: dayStart.toISOString().split('T')[0],
      newUsers,
      newParticipations,
      newRatings
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}

export const GET = withRateLimit(apiRateLimit, withErrorHandler(getStatsHandler))
