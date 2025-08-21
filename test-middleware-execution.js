const { PrismaClient } = require('./src/generated/prisma')

async function testMiddlewareLogic() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing middleware logic...')
    
    // Test 1: Check maintenance mode status
    console.log('\n1. Checking maintenance mode status:')
    const maintenanceMode = await prisma.maintenanceMode.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    if (maintenanceMode) {
      console.log(`   - Maintenance mode enabled: ${maintenanceMode.isEnabled}`)
      console.log(`   - Title: ${maintenanceMode.title}`)
      console.log(`   - Message: ${maintenanceMode.message}`)
    } else {
      console.log('   - No maintenance mode record found (default: disabled)')
    }
    
    // Test 2: Check working hours
    console.log('\n2. Checking working hours:')
    const workingHours = await prisma.workingHours.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    if (workingHours) {
      console.log(`   - Working hours: ${workingHours.startHour}:00 - ${workingHours.endHour}:00`)
      console.log(`   - Enabled: ${workingHours.isEnabled}`)
    } else {
      console.log('   - No working hours record found (default: 6:00-16:00, enabled)')
    }
    
    // Test 3: Check current time logic
    console.log('\n3. Current time check:')
    const now = new Date()
    const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}))
    const currentHour = thailandTime.getHours()
    
    console.log(`   - Current Thailand time: ${thailandTime.toLocaleString('th-TH')}`)
    console.log(`   - Current hour: ${currentHour}`)
    
    // Use actual working hours from database or defaults
    const startHour = workingHours ? workingHours.startHour : 6
    const endHour = workingHours ? workingHours.endHour : 16
    const isEnabled = workingHours ? workingHours.isEnabled : true
    
    const withinWorkingHours = !isEnabled || (currentHour >= startHour && currentHour < endHour)
    
    console.log(`   - Within working hours (${startHour}:00-${endHour}:00): ${withinWorkingHours}`)
    
    // Test 4: Expected middleware behavior
    console.log('\n4. Expected middleware behavior:')
    const maintenanceEnabled = maintenanceMode ? maintenanceMode.isEnabled : false
    
    if (maintenanceEnabled) {
      console.log('   ✅ Should redirect to /maintenance (maintenance mode enabled)')
    } else if (!withinWorkingHours) {
      console.log('   ✅ Should redirect to /maintenance (outside working hours)')
    } else {
      console.log('   ✅ Should allow access (within working hours, no maintenance)')
    }
    
    console.log('\n🎯 Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing middleware logic:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testMiddlewareLogic()
