import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { handleFileUpload } from '@/lib/utils/fileUpload'
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
    const uploadedFiles = await handleFileUpload(req, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      destination: 'public/uploads',
      generateThumbnail: true
    })

    // Save file records to database
    const fileRecords = await Promise.all(
      uploadedFiles.map(file => 
        prisma.file.create({
          data: {
            filename: file.filename,
            originalName: file.originalName,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: file.url,
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
        mimetype: record.mimetype
      }))
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
