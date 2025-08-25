// Debug script to test login flow and identify the issue
// Using built-in fetch (Node.js 18+)

const BASE_URL = 'https://brainbang.vercel.app';

async function debugLoginFlow() {
  console.log('🔍 Debugging login flow...\n');

  try {
    // Test 1: Check if login API is accessible
    console.log('1. Testing login API accessibility...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id: '',
        name: 'Test User'
      })
    });

    console.log(`   Status: ${loginResponse.status}`);
    const loginData = await loginResponse.json();
    console.log(`   Response:`, loginData);

    if (loginResponse.status === 404) {
      console.log('   ❌ User not found - this is expected for test data');
    }

    // Test 2: Check maintenance status
    console.log('\n2. Checking maintenance status...');
    const maintenanceResponse = await fetch(`${BASE_URL}/api/maintenance-status`);
    const maintenanceData = await maintenanceResponse.json();
    console.log(`   Maintenance enabled: ${maintenanceData?.maintenanceMode?.isEnabled}`);
    
    if (maintenanceData?.maintenanceMode?.isEnabled) {
      console.log('   ⚠️  MAINTENANCE MODE IS ENABLED - This could cause login issues!');
      console.log(`   Title: ${maintenanceData.maintenanceMode.title}`);
      console.log(`   Message: ${maintenanceData.maintenanceMode.message}`);
    }

    // Test 3: Check working hours
    console.log('\n3. Checking working hours...');
    try {
      const workingHoursResponse = await fetch(`${BASE_URL}/api/admin/working-hours`);
      if (workingHoursResponse.ok) {
        const workingHoursData = await workingHoursResponse.json();
        console.log(`   Working hours enabled: ${workingHoursData?.data?.isEnabled}`);
        console.log(`   Hours: ${workingHoursData?.data?.startHour}:00 - ${workingHoursData?.data?.endHour}:00`);
        
        // Check current Thailand time
        const now = new Date();
        const thailandTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const currentHour = thailandTime.getHours();
        console.log(`   Current Thailand hour: ${currentHour}`);
        
        if (workingHoursData?.data?.isEnabled) {
          const isWithinHours = currentHour >= workingHoursData.data.startHour && currentHour < workingHoursData.data.endHour;
          console.log(`   Within working hours: ${isWithinHours}`);
          
          if (!isWithinHours) {
            console.log('   ⚠️  OUTSIDE WORKING HOURS - This could cause login issues!');
          }
        }
      }
    } catch (error) {
      console.log('   ❌ Could not fetch working hours (might need authentication)');
    }

    // Test 4: Test the login page directly
    console.log('\n4. Testing login page accessibility...');
    const loginPageResponse = await fetch(`${BASE_URL}/login`);
    console.log(`   Login page status: ${loginPageResponse.status}`);
    
    if (loginPageResponse.status !== 200) {
      console.log('   ❌ Login page is not accessible!');
    }

    // Test 5: Test homepage accessibility
    console.log('\n5. Testing homepage accessibility...');
    const homepageResponse = await fetch(`${BASE_URL}/homepage`);
    console.log(`   Homepage status: ${homepageResponse.status}`);
    
    if (homepageResponse.status === 302 || homepageResponse.status === 307) {
      console.log('   ↩️  Homepage redirects (likely due to middleware protection)');
      const location = homepageResponse.headers.get('location');
      if (location) {
        console.log(`   Redirect location: ${location}`);
      }
    }

    // Test 6: Check if there are any database connection issues
    console.log('\n6. Testing health endpoint...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log(`   Health status: ${healthData.status || 'OK'}`);
      } else {
        console.log(`   Health check failed: ${healthResponse.status}`);
      }
    } catch (error) {
      console.log('   ❌ Health endpoint not available');
    }

    console.log('\n📋 SUMMARY:');
    console.log('   Check the following potential issues:');
    console.log('   1. Maintenance mode enabled');
    console.log('   2. Outside working hours');
    console.log('   3. Database connection issues');
    console.log('   4. Middleware redirect loops');
    console.log('   5. Cookie/JWT token issues');

  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  }
}

// Run the debug
debugLoginFlow();
