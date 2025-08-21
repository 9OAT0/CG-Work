import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if decoded token has userId
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters for date filtering
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    
    // Default to today if no date specified
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    
    // Set to start and end of day in Thai timezone (UTC+7)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    startOfDay.setTime(startOfDay.getTime() - (7 * 60 * 60 * 1000)); // Convert to UTC
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    endOfDay.setTime(endOfDay.getTime() - (7 * 60 * 60 * 1000)); // Convert to UTC

    // Get daily login statistics
    const dailyLogins = await prisma.loginHistory.findMany({
      where: {
        loginDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        user: {
          select: {
            id: true,
            student_id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        loginDate: 'desc'
      }
    });

    // Get unique users who logged in today
    const uniqueUsers = await prisma.loginHistory.groupBy({
      by: ['userId'],
      where: {
        loginDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _count: {
        userId: true
      }
    });

    // Get user details for unique users
    const userIds = uniqueUsers.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        student_id: true,
        name: true,
        role: true,
        lastLoginDate: true
      }
    });

    // Combine data
    const uniqueUsersWithDetails = uniqueUsers.map(uniqueUser => {
      const userDetail = users.find(u => u.id === uniqueUser.userId);
      return {
        ...userDetail,
        loginCount: uniqueUser._count.userId
      };
    });

    // Get statistics
    const stats = {
      totalLogins: dailyLogins.length,
      uniqueUsers: uniqueUsers.length,
      adminLogins: dailyLogins.filter(login => login.user?.role === 'admin').length,
      userLogins: dailyLogins.filter(login => login.user?.role === 'user').length,
      date: targetDate.toISOString().split('T')[0]
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        loginHistory: dailyLogins.map(login => ({
          id: login.id,
          loginDate: login.loginDate,
          ipAddress: login.ipAddress,
          userAgent: login.userAgent,
          user: login.user
        })),
        uniqueUsers: uniqueUsersWithDetails
      }
    });

  } catch (error) {
    console.error('Daily logins API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
