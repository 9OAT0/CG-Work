import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyAdmin } from '@/lib/auth'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const auth = verifyAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    // ดึงข้อมูลผู้ใช้ทั้งหมด
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            joinedBooths: true,
            boothRatings: true,
            boothFavorites: true
          }
        }
      },
      orderBy: { score: 'desc' }
    })

    // เตรียมข้อมูลสำหรับ Excel
    const excelData = users.map((user, index) => ({
      'อันดับ': index + 1,
      'รหัสนักศึกษา': user.student_id || 'ไม่ระบุ',
      'ชื่อ': user.name,
      'คณะ': user.dept,
      'คะแนน': user.score,
      'บทบาท': user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป',
      'บูธที่เข้าร่วม': user._count.joinedBooths,
      'จำนวนรีวิว': user._count.boothRatings,
      'จำนวนถูกใจ': user._count.boothFavorites,
      'วันที่สมัคร': new Date(user.createdAt).toLocaleDateString('th-TH', {
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
      { wch: 8 },  // อันดับ
      { wch: 15 }, // รหัสนักศึกษา
      { wch: 25 }, // ชื่อ
      { wch: 20 }, // คณะ
      { wch: 10 }, // คะแนน
      { wch: 15 }, // บทบาท
      { wch: 12 }, // บูธที่เข้าร่วม
      { wch: 12 }, // จำนวนรีวิว
      { wch: 12 }, // จำนวนถูกใจ
      { wch: 20 }  // วันที่สมัคร
    ]
    worksheet['!cols'] = columnWidths

    // เพิ่ม worksheet เข้า workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ข้อมูลผู้ใช้')

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
    
    const filename = `ข้อมูลผู้ใช้_${currentDate}.xlsx`

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
    console.error('Error exporting users:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการ export ข้อมูล' }, 
      { status: 500 }
    )
  }
}
