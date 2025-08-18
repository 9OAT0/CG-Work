import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyAdmin } from '@/lib/auth'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    // ดึงข้อมูลปัญหาทรานสคริปต์ทั้งหมด
    const issues = await prisma.transcriptIssue.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // เตรียมข้อมูลสำหรับ Excel
    const excelData = issues.map((issue, index) => ({
      'ลำดับ': index + 1,
      'รหัสนักศึกษา': issue.student_id,
      'ชื่อ': issue.name,
      'ปีการศึกษา': issue.year,
      'คณะ': issue.dept,
      'วันที่เพิ่ม': new Date(issue.createdAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }))

    // สร้าง workbook และ worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // ปรับความกว้างของคอลัมน์
    const columnWidths = [
      { wch: 8 },  // ลำดับ
      { wch: 15 }, // รหัสนักศึกษา
      { wch: 25 }, // ชื่อ
      { wch: 12 }, // ปีการศึกษา
      { wch: 20 }, // คณะ
      { wch: 20 }  // วันที่เพิ่ม
    ]
    worksheet['!cols'] = columnWidths

    // เพิ่ม worksheet เข้า workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ปัญหาทรานสคริปต์')

    // สร้างไฟล์ Excel
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // สร้างชื่อไฟล์พร้อมวันที่
    const currentDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-')
    
    const filename = `ปัญหาทรานสคริปต์_${currentDate}.xlsx`

    // ส่งไฟล์กลับ
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': excelBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Error exporting transcript issues:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการ export ข้อมูล' }, 
      { status: 500 }
    )
  }
}
