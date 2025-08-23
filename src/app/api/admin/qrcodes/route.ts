import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { verify, sign } from 'jsonwebtoken'
import QRCode from 'qrcode'
import crypto from 'crypto'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!
const QR_JWT_SECRET = process.env.QR_JWT_SECRET || JWT_SECRET

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '')
    .replace(/\-+/g, '-')
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded: any = verify(token, JWT_SECRET)
    const me = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const boothId = searchParams.get('boothId') || undefined

    const where = boothId ? { boothId } : {}
    const codes = await prisma.qrCode.findMany({
      where,
      include: { booth: { select: { booth_name: true, booth_code: true } } },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      data: codes.map(c => ({
        id: c.id,
        code: c.code,
        boothId: c.boothId,
        booth_name: c.booth.booth_name,
        booth_code: c.booth.booth_code,
        entitlementKey: c.entitlementKey,
        cost: c.cost,
        rule: c.rule,
        uses: c.uses,
        maxUses: c.maxUses,
        active: c.active,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      }))
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded: any = verify(token, JWT_SECRET)
    const me = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const {
      boothId,
      activityName,
      cost,
      rule,          // 'ONCE_PER_EVENT' | 'ONCE_PER_DAY' | 'UNLIMITED'
      maxUses,       // optional number
      expiresAt,     // optional ISO string
      active = true, // default
      useJwt = true  // ควร true เพื่อความปลอดภัย
    } = body || {}

    if (!boothId || !activityName || !Number.isInteger(cost) || cost <= 0) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }

    const booth = await prisma.booth.findUnique({ where: { id: boothId } })
    if (!booth) return NextResponse.json({ error: 'Booth not found' }, { status: 404 })

    const entitlementKey = `${booth.booth_code}:${slugify(activityName)}`
    const random = crypto.randomBytes(8).toString('base64url')
    const rawCode = `QR-${booth.booth_code}-${random}`

    const created = await prisma.qrCode.create({
      data: {
        code: rawCode,
        boothId: boothId,
        entitlementKey,
        cost,
        rule: rule || 'ONCE_PER_EVENT',
        active,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: { booth: true }
    })

    // ทำสตริงที่ฝังใน QR (JWT แนะนำ)
    let qrString = created.code
    if (useJwt) {
      const payload: any = { codeId: created.id } // ไม่ต้องส่ง cost จาก client เพื่อกันแก้เอง
      if (created.expiresAt) {
        payload.exp = Math.floor(new Date(created.expiresAt).getTime() / 1000)
      }
      qrString = sign(payload, QR_JWT_SECRET)
    }

    const qrDataUrl = await QRCode.toDataURL(qrString, { errorCorrectionLevel: 'M' })

    return NextResponse.json({
      message: 'สร้าง QR สำเร็จ',
      data: {
        id: created.id,
        booth: { id: created.boothId, name: created.booth.booth_name, code: created.booth.booth_code },
        activityName,
        entitlementKey,
        cost: created.cost,
        rule: created.rule,
        maxUses: created.maxUses,
        active: created.active,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
        qrString,     // ค่าที่จะเอาไปสแกน
        qrDataUrl     // รูป QR (base64)
      }
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
