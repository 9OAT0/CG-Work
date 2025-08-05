import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withErrorHandler, NotFoundError } from '@/lib/middleware/errorHandler'
import { withRateLimit, apiRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()

async function getBoothBasicHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const boothId = params.id

  if (!boothId) {
    throw new NotFoundError('Missing booth ID')
  }

  // Get only basic booth information for faster loading
  const booth = await prisma.booth.findUnique({
    where: { id: boothId },
    select: {
      id: true,
      booth_name: true,
      booth_code: true,
      dept_type: true,
      description: true,
      pics: true,
      owner_names: true
    }
  })

  if (!booth) {
    throw new NotFoundError('Booth not found')
  }

  return NextResponse.json({
    id: booth.id,
    booth_name: booth.booth_name,
    booth_code: booth.booth_code,
    dept_type: booth.dept_type,
    description: booth.description,
    pics: booth.pics || [],
    owner_names: booth.owner_names || []
  })
}

export const GET = withRateLimit(apiRateLimit, withErrorHandler(getBoothBasicHandler))
