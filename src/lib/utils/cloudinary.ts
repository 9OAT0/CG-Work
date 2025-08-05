import { v2 as cloudinary } from 'cloudinary'
import { ValidationError } from '../middleware/errorHandler'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  resource_type: string
  bytes: number
  url: string
  thumbnail_url?: string
}

export interface CloudinaryUploadOptions {
  folder?: string
  transformation?: any[]
  quality?: string | number
  format?: string
  width?: number
  height?: number
  crop?: string
  generateThumbnail?: boolean
  thumbnailTransformation?: any[]
}

const DEFAULT_OPTIONS: CloudinaryUploadOptions = {
  folder: 'booth-images',
  quality: 'auto:good',
  format: 'auto',
  crop: 'limit',
  width: 1920,
  height: 1080,
  generateThumbnail: true,
  thumbnailTransformation: [
    { width: 300, height: 300, crop: 'fill', gravity: 'center' },
    { quality: 'auto:good', format: 'auto' }
  ]
}

export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  try {
    // Validate file
    validateFile(file)
    
    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataURI = `data:${file.type};base64,${base64}`
    
    // Generate unique public_id
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const publicId = `${opts.folder}/${timestamp}_${randomString}`
    
    // Upload to Cloudinary with transformations
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      public_id: publicId,
      folder: opts.folder,
      transformation: [
        {
          width: opts.width,
          height: opts.height,
          crop: opts.crop,
          quality: opts.quality,
          format: opts.format
        }
      ],
      resource_type: 'auto'
    })
    
    let thumbnailUrl = ''
    
    // Generate thumbnail if requested
    if (opts.generateThumbnail && opts.thumbnailTransformation) {
      thumbnailUrl = cloudinary.url(uploadResult.public_id, {
        transformation: opts.thumbnailTransformation
      })
    }
    
    return {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      url: uploadResult.url,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      resource_type: uploadResult.resource_type,
      bytes: uploadResult.bytes,
      thumbnail_url: thumbnailUrl
    }
    
  } catch (error: any) {
    console.error('Cloudinary upload error:', error)
    throw new Error(`เกิดข้อผิดพลาดในการอัพโหลดไฟล์: ${error.message}`)
  }
}

export async function uploadMultipleToCloudinary(
  files: File[],
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult[]> {
  const results: CloudinaryUploadResult[] = []
  
  for (const file of files) {
    try {
      const result = await uploadToCloudinary(file, options)
      results.push(result)
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error)
      throw error
    }
  }
  
  return results
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw new Error('เกิดข้อผิดพลาดในการลบไฟล์')
  }
}

function validateFile(file: File): void {
  const maxSize = 10 * 1024 * 1024 // 10MB for Cloudinary
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ]
  
  if (file.size > maxSize) {
    throw new ValidationError(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 10MB)`)
  }
  
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new ValidationError(`ไฟล์ ${file.name} ไม่ใช่ประเภทที่รองรับ`)
  }
  
  if (!file.name || file.name.trim() === '') {
    throw new ValidationError('ชื่อไฟล์ไม่ถูกต้อง')
  }
  
  // Security check
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    throw new ValidationError('ชื่อไฟล์ไม่ถูกต้อง')
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getOptimizedImageUrl(
  publicId: string, 
  width?: number, 
  height?: number, 
  quality: string = 'auto:good'
): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width,
        height,
        crop: 'limit',
        quality,
        format: 'auto'
      }
    ]
  })
}

export function getThumbnailUrl(publicId: string, size: number = 300): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: size,
        height: size,
        crop: 'fill',
        gravity: 'center',
        quality: 'auto:good',
        format: 'auto'
      }
    ]
  })
}
