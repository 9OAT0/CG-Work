import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { lookup } from 'mime-types'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath)

    // Security check - ensure the path is within uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const resolvedPath = path.resolve(fullPath)
    const resolvedUploadsDir = path.resolve(uploadsDir)
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(fullPath)
    
    // Get MIME type
    const mimeType = lookup(fullPath) || 'application/octet-stream'
    
    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', mimeType)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    
    // For images, add additional headers
    if (mimeType.startsWith('image/')) {
      headers.set('Content-Disposition', 'inline')
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
