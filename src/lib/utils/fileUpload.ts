import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { ValidationError } from '../middleware/errorHandler'

export interface UploadedFile {
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
  url: string
}

export interface UploadOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  destination?: string
  generateThumbnail?: boolean
  thumbnailSize?: { width: number; height: number }
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  destination: 'public/uploads',
  generateThumbnail: true,
  thumbnailSize: { width: 300, height: 300 }
}

export async function handleFileUpload(
  req: NextRequest,
  options: UploadOptions = {}
): Promise<UploadedFile[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      throw new ValidationError('ไม่พบไฟล์ที่อัพโหลด')
    }

    const uploadedFiles: UploadedFile[] = []

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), opts.destination!)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    for (const file of files) {
      // Validate file
      validateFile(file, opts)

      // Generate unique filename with better security
      const filename = generateSecureFilename(file.name)
      const filepath = path.join(uploadDir, filename)

      // Convert file to buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(new Uint8Array(bytes))

      // Process image if needed
      let processedBuffer: Buffer = buffer
      let finalExtension = path.extname(file.name)
      
      if (file.type.startsWith('image/')) {
        const result = await processImage(buffer, opts)
        processedBuffer = result.buffer
        finalExtension = result.extension
        
        // Update filename with correct extension if changed
        if (finalExtension !== path.extname(filename)) {
          const baseName = path.basename(filename, path.extname(filename))
          const newFilename = baseName + finalExtension
          const newFilepath = path.join(uploadDir, newFilename)
          
          await writeFile(newFilepath, processedBuffer)
          
          const uploadedFile: UploadedFile = {
            filename: newFilename,
            originalName: file.name,
            mimetype: `image/${finalExtension.slice(1)}`,
            size: processedBuffer.length,
            path: newFilepath,
            url: `/uploads/${newFilename}`,
          }
          
          // Generate thumbnail if requested
          if (opts.generateThumbnail) {
            await generateThumbnail(processedBuffer, newFilename, opts)
          }
          
          uploadedFiles.push(uploadedFile)
          continue
        }
      }

      // Save file
      await writeFile(filepath, processedBuffer)

      // Generate thumbnail if requested
      if (opts.generateThumbnail && file.type.startsWith('image/')) {
        await generateThumbnail(processedBuffer, filename, opts)
      }

      const uploadedFile: UploadedFile = {
        filename,
        originalName: file.name,
        mimetype: file.type,
        size: processedBuffer.length,
        path: filepath,
        url: `/uploads/${filename}`,
      }

      uploadedFiles.push(uploadedFile)
    }

    return uploadedFiles
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    console.error('File upload error:', error)
    throw new Error('เกิดข้อผิดพลาดในการอัพโหลดไฟล์')
  }
}

function validateFile(file: File, options: UploadOptions): void {
  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    throw new ValidationError(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด ${formatFileSize(options.maxSize)})`)
  }

  // Check file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new ValidationError(`ไฟล์ ${file.name} ไม่ใช่ประเภทที่อนุญาต`)
  }

  // Check filename
  if (!file.name || file.name.trim() === '') {
    throw new ValidationError('ชื่อไฟล์ไม่ถูกต้อง')
  }
}

async function processImage(
  buffer: Buffer, 
  options: UploadOptions
): Promise<{ buffer: Buffer; extension: string }> {
  try {
    let image = sharp(buffer)
    
    // Auto-orient based on EXIF data
    image = image.rotate()
    
    // Get metadata
    const metadata = await image.metadata()
    
    // Resize if too large
    if (metadata.width && metadata.width > 1920) {
      image = image.resize(1920, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
    }
    
    // Convert to WebP for better compression and smaller file size
    // This is especially important for deployment
    if (metadata.format !== 'gif') {
      image = image.webp({ 
        quality: 85,
        effort: 6 // Higher effort for better compression
      })
      return {
        buffer: await image.toBuffer(),
        extension: '.webp'
      }
    }
    
    // For GIFs, keep original format but optimize
    if (metadata.format === 'gif') {
      return {
        buffer: await image.gif().toBuffer(),
        extension: '.gif'
      }
    }
    
    return {
      buffer: await image.toBuffer(),
      extension: path.extname(metadata.format || '.jpg')
    }
  } catch (error) {
    console.error('Image processing error:', error)
    // If image processing fails, return original buffer
    return {
      buffer,
      extension: '.jpg'
    }
  }
}

async function generateThumbnail(
  buffer: Buffer, 
  filename: string, 
  options: UploadOptions
): Promise<string> {
  try {
    const thumbnailDir = path.join(process.cwd(), options.destination!, 'thumbnails')
    if (!existsSync(thumbnailDir)) {
      await mkdir(thumbnailDir, { recursive: true })
    }

    // Generate thumbnail filename with webp extension
    const baseName = path.basename(filename, path.extname(filename))
    const thumbnailFilename = `thumb_${baseName}.webp`
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)

    await sharp(buffer)
      .resize(options.thumbnailSize!.width, options.thumbnailSize!.height, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ 
        quality: 75,
        effort: 6
      })
      .toFile(thumbnailPath)

    return `/uploads/thumbnails/${thumbnailFilename}`
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return ''
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase()
}

export function isImageFile(mimetype: string): boolean {
  return mimetype.startsWith('image/')
}

export function generateSecureFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = path.extname(originalName).toLowerCase()
  const baseName = path.basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20)
  
  return `${timestamp}_${baseName}_${randomString}${extension}`
}

// New utility function for deployment optimization
export function optimizeForDeployment(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
}

// Enhanced file validation for production
export function validateFileForProduction(file: File): void {
  // Additional validation for production deployment
  const maxSize = 5 * 1024 * 1024 // 5MB limit for production
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ]
  
  if (file.size > maxSize) {
    throw new ValidationError(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${formatFileSize(maxSize)})`)
  }
  
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new ValidationError('รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP, GIF)')
  }
  
  // Check filename for security
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    throw new ValidationError('ชื่อไฟล์ไม่ถูกต้อง')
  }
}
