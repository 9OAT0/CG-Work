import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { uploadMultipleToCloudinary } from '@/lib/utils/cloudinary'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { withRateLimit, uploadRateLimit } from '@/lib/middleware/rateLimit'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

async function uploadHandler(req: NextRequest) {
  // Verify authentication
  const token = req.cookies.get('token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: string }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    // Get files from form data
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ที่อัพโหลด' }, { status: 400 })
    }

    // Upload files to Cloudinary
    const cloudinaryResults = await uploadMultipleToCloudinary(files, {
      folder: 'booth-images',
      quality: 'auto:good',
      format: 'auto',
      width: 1920,
      height: 1080,
      crop: 'limit',
      generateThumbnail: true
    })

    // Save file records to database
    const fileRecords = await Promise.all(
      cloudinaryResults.map(result => 
        prisma.file.create({
          data: {
            filename: result.public_id.split('/').pop() || result.public_id,
            originalName: files[cloudinaryResults.indexOf(result)].name,
            mimetype: `image/${result.format}`,
            size: result.bytes,
            path: result.public_id,
            url: result.secure_url,
            uploadedBy: payload.id
          }
        })
      )
    )

    return NextResponse.json({
      message: 'อัพโหลดไฟล์สำเร็จ',
      files: fileRecords.map(record => ({
        id: record.id,
        filename: record.filename,
        originalName: record.originalName,
        url: record.url,
        size: record.size,
        mimetype: record.mimetype,
        uploadedAt: record.createdAt
      })),
      cloudinary: true
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์' },
      { status: 400 }
    )
  }
}

export const POST = withRateLimit(
  uploadRateLimit,
  withErrorHandler(uploadHandler)
)
