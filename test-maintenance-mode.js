const { PrismaClient } = require('./src/generated/prisma')

const prisma = new PrismaClient()

async function testMaintenanceMode() {
  console.log('🔧 Testing Maintenance Mode System...\n')

  try {
    // 1. สร้างข้อมูล maintenance mode ใหม่ (เปิด maintenance mode)
    console.log('1. เปิด Maintenance Mode...')
    const maintenanceOn = await prisma.maintenanceMode.create({
      data: {
        isEnabled: true,
        title: "ระบบกำลังปรับปรุง",
        message: "เว็บไซต์อยู่ในช่วงปรับปรุงระบบ คาดว่าจะเสร็จสิ้นภายใน 2 ชั่วโมง กรุณากลับมาใหม่อีกครั้ง",
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 ชั่วโมงจากตอนนี้
        updatedAt: new Date()
      }
    })
    console.log('✅ เปิด Maintenance Mode สำเร็จ')
    console.log(`   - Title: ${maintenanceOn.title}`)
    console.log(`   - Message: ${maintenanceOn.message}`)
    console.log(`   - End Time: ${maintenanceOn.endTime}\n`)

    // 2. ตรวจสอบสถานะ maintenance mode
    console.log('2. ตรวจสอบสถานะ Maintenance Mode...')
    const currentStatus = await prisma.maintenanceMode.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    console.log('✅ สถานะปัจจุบัน:')
    console.log(`   - Enabled: ${currentStatus.isEnabled}`)
    console.log(`   - Title: ${currentStatus.title}`)
    console.log(`   - Message: ${currentStatus.message}\n`)

    // 3. รอสักครู่แล้วปิด maintenance mode
    console.log('3. รอ 2 วินาที แล้วปิด Maintenance Mode...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    const maintenanceOff = await prisma.maintenanceMode.create({
      data: {
        isEnabled: false,
        title: "ระบบอยู่ในช่วงปรับปรุง",
        message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
        updatedAt: new Date()
      }
    })
    console.log('✅ ปิด Maintenance Mode สำเร็จ')
    console.log(`   - Enabled: ${maintenanceOff.isEnabled}\n`)

    // 4. ตรวจสอบสถานะสุดท้าย
    console.log('4. ตรวจสอบสถานะสุดท้าย...')
    const finalStatus = await prisma.maintenanceMode.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    console.log('✅ สถานะสุดท้าย:')
    console.log(`   - Enabled: ${finalStatus.isEnabled}`)
    console.log(`   - Title: ${finalStatus.title}`)
    console.log(`   - Message: ${finalStatus.message}\n`)

    console.log('🎉 การทดสอบ Maintenance Mode เสร็จสิ้น!')
    console.log('\n📋 สรุปการทำงาน:')
    console.log('   - Middleware จะตรวจสอบ maintenance mode ก่อน working hours')
    console.log('   - ถ้า maintenance mode เปิดอยู่ user ทั่วไปจะถูก redirect ไป /maintenance')
    console.log('   - Admin สามารถเข้าใช้งานได้ปกติแม้ในช่วง maintenance')
    console.log('   - หน้า maintenance จะแสดงข้อความที่กำหนดจากฐานข้อมูล')
    console.log('   - API /api/admin/maintenance-mode สำหรับ admin จัดการ')
    console.log('   - API /api/maintenance-status สำหรับดึงข้อมูลแสดงผล')

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// เรียกใช้ฟังก์ชันทดสอบ
testMaintenanceMode()
