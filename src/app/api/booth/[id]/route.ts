// app/api/booth/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const urlParts = req.nextUrl.pathname.split('/');
  const boothId = urlParts[urlParts.length - 1];

  if (!boothId) {
    return NextResponse.json([{ error: 'Missing booth ID' }, {status: 400}])
  }

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
