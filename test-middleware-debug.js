const { PrismaClient } = require('./src/generated/prisma')

const prisma = new PrismaClient()

async function testMiddlewareLogic() {
  console.log('🔍 Testing Middleware Logic...\n')

  try {
    // 1. ตรวจสอบการเชื่อมต่อฐานข้อมูล
    console.log('1. ทดสอบการเชื่อมต่อฐานข้อมูล...')
    await prisma.$connect()
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n')

    // 2. ตรวจสอบ working hours
    console.log('2. ตรวจสอบ Working Hours...')
    const workingHours = await prisma.workingHours.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    if (workingHours) {
      console.log('✅ พบข้อมูล Working Hours:')
      console.log(`   - Start Hour: ${workingHours.startHour}`)
      console.log(`   - End Hour: ${workingHours.endHour}`)
      console.log(`   - Enabled: ${workingHours.isEnabled}`)
    } else {
      console.log('⚠️  ไม่พบข้อมูล Working Hours - จะใช้ค่าเริ่มต้น (6-16)')
    }

    // 3. ตรวจสอบ maintenance mode
    console.log('\n3. ตรวจสอบ Maintenance Mode...')
    const maintenanceMode = await prisma.maintenanceMode.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    if (maintenanceMode) {
      console.log('✅ พบข้อมูล Maintenance Mode:')
      console.log(`   - Enabled: ${maintenanceMode.isEnabled}`)
      console.log(`   - Title: ${maintenanceMode.title}`)
      console.log(`   - Message: ${maintenanceMode.message}`)
    } else {
      console.log('⚠️  ไม่พบข้อมูล Maintenance Mode - จะใช้ค่าเริ่มต้น (disabled)')
    }

    // 4. ทดสอบ logic การตรวจสอบเวลา
    console.log('\n4. ทดสอบ Logic การตรวจสอบเวลา...')
    const now = new Date()
    const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}))
    const currentHour = thailandTime.getHours()
    
    console.log(`   - เวลาปัจจุบัน: ${currentHour}:${thailandTime.getMinutes().toString().padStart(2, '0')} น.`)
    
    const startHour = workingHours?.startHour || 6
    const endHour = workingHours?.endHour || 16
    const isEnabled = workingHours?.isEnabled !== false
    
    const isWithinWorkingHours = !isEnabled || (currentHour >= startHour && currentHour < endHour)
    
    console.log(`   - เวลาทำงาน: ${startHour}:00 - ${endHour}:00 น.`)
    console.log(`   - การจำกัดเวลาเปิดอยู่: ${isEnabled}`)
    console.log(`   - อยู่ในเวลาทำงาน: ${isWithinWorkingHours}`)
    
    if (!isWithinWorkingHours) {
      console.log('❌ ผู้ใช้ทั่วไปควรถูก redirect ไปหน้า maintenance')
    } else {
      console.log('✅ ผู้ใช้ทั่วไปสามารถเข้าใช้งานได้')
    }

    // 5. สรุปสถานะ
    console.log('\n📋 สรุปสถานะระบบ:')
    const maintenanceEnabled = maintenanceMode?.isEnabled || false
    
    if (maintenanceEnabled) {
      console.log('🔧 Maintenance Mode: เปิดอยู่ - ผู้ใช้ทั่วไปจะถูก redirect')
    } else if (!isWithinWorkingHours) {
      console.log('⏰ Working Hours: นอกเวลาทำงาน - ผู้ใช้ทั่วไปจะถูก redirect')
    } else {
      console.log('✅ ระบบเปิดให้ใช้งานปกติ')
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// เรียกใช้ฟังก์ชันทดสอบ
testMiddlewareLogic()
