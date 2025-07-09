// app/api/booth/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const boothId = params.id

  const booth = await prisma.booth.findUnique({
    where: { id: boothId },
  })

  if (!booth) {
    return NextResponse.json({ error: 'Booth not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: booth.id,
    booth_name: booth.booth_name,
    dept_type: booth.dept_type,
    description: booth.description,
    pics: booth.pics,
  })
}
