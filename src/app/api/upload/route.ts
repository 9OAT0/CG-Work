// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import jwt from 'jsonwebtoken'
import { uploadMultipleToCloudinary } from '@/lib/utils/cloudinary'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { withRateLimit, uploadRateLimit } from '@/lib/middleware/rateLimit'

export const runtime = 'nodejs' // ✅ สำคัญ: ให้แน่ใจว่าเป็น Node runtime

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

function getToken(req: NextRequest) {
  // 1) คุกกี้ (ปกติ)
  const byCookie = req.cookies.get('token')?.value
  if (byCookie) return byCookie
  // 2) เผื่อบางเคสส่ง Authorization: Bearer <token>
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim()
  return null
}

async function uploadHandler(req: NextRequest) {
  // --- Auth ---
  const rawToken = getToken(req)
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = jwt.verify(rawToken, JWT_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // (ถ้าต้องล็อกเฉพาะแอดมิน ให้เช็ค role/payload ที่นี่)
  // if (payload?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ที่อัพโหลด' }, { status: 400 })
    }

    const results = await uploadMultipleToCloudinary(files, {
      folder: 'booth-images',
      quality: 'auto:good',
      format: 'auto',
      width: 1920,
      height: 1080,
      crop: 'limit',
      generateThumbnail: true,
    })

    const records = await Promise.all(
      results.map((r, i) =>
        prisma.file.create({
          data: {
            filename: r.public_id.split('/').pop() || r.public_id,
            originalName: files[i].name,
            mimetype: `image/${r.format}`,
            size: r.bytes,
            path: r.public_id,
            url: r.secure_url,
            uploadedBy: payload.id, // ต้องมี id ใน payload ตอน sign token
          },
        }),
      ),
    )

    return NextResponse.json({
      message: 'อัพโหลดไฟล์สำเร็จ',
      files: records.map((rec) => ({
        id: rec.id,
        filename: rec.filename,
        originalName: rec.originalName,
        url: rec.url,
        size: rec.size,
        mimetype: rec.mimetype,
        uploadedAt: rec.createdAt,
      })),
      cloudinary: true,
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err?.message || 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์' },
      { status: 400 },
    )
  }
}

export const POST = withRateLimit(uploadRateLimit, withErrorHandler(uploadHandler))
