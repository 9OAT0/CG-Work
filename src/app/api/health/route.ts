import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

const prisma = new PrismaClient()

async function healthCheckHandler(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Test database connection
    await prisma.user.findFirst()
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'disconnected',
      error: 'Database connection failed',
      environment: process.env.NODE_ENV || 'development'
    }, { status: 503 })
  }
}

export const GET = withErrorHandler(healthCheckHandler)
