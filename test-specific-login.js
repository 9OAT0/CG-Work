// Test specific login credentials to debug the issue
async function testSpecificLogin() {
  console.log('🔍 Testing specific login credentials...\n');

  const BASE_URL = 'https://brainbang.vercel.app';
  const credentials = {
    student_id: '66022123',
    name: 'Thanachat'
  };

  try {
    console.log('1. Testing login with credentials:', credentials);
    
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    console.log(`   Login API Status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('   ✅ Login successful!');
      console.log('   Response:', loginData);
      
      // Check if cookies are set
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        console.log('   🍪 Cookies set:', setCookieHeader);
      } else {
        console.log('   ⚠️  No cookies set in response');
      }
      
      // Test if we can access protected routes with the token
      console.log('\n2. Testing access to homepage after login...');
      
      // Extract token from set-cookie header if available
      let token = '';
      if (setCookieHeader) {
        const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
        }
      }
      
      if (token) {
        const homepageResponse = await fetch(`${BASE_URL}/homepage`, {
          headers: {
            'Cookie': `token=${token}`
          }
        });
        
        console.log(`   Homepage access status: ${homepageResponse.status}`);
        
        if (homepageResponse.status === 302 || homepageResponse.status === 307) {
          const location = homepageResponse.headers.get('location');
          console.log(`   ↩️  Redirected to: ${location}`);
          
          if (location && location.includes('/login')) {
            console.log('   ❌ ISSUE FOUND: Still redirecting to login after successful login!');
            console.log('   This suggests a middleware or authentication issue.');
          }
        } else if (homepageResponse.ok) {
          console.log('   ✅ Homepage accessible after login');
        }
      }
      
    } else {
      const errorData = await loginResponse.json();
      console.log('   ❌ Login failed');
      console.log('   Error:', errorData);
      
      if (loginResponse.status === 404) {
        console.log('   💡 User not found in database. Possible issues:');
        console.log('      - User data not properly seeded');
        console.log('      - Database connection issues');
        console.log('      - Incorrect student_id or name format');
      }
    }

    // Test maintenance and working hours
    console.log('\n3. Checking system status...');
    
    const maintenanceResponse = await fetch(`${BASE_URL}/api/maintenance-status`);
    if (maintenanceResponse.ok) {
      const maintenanceData = await maintenanceResponse.json();
      console.log(`   Maintenance mode: ${maintenanceData?.maintenanceMode?.isEnabled ? 'ENABLED' : 'disabled'}`);
      
      if (maintenanceData?.maintenanceMode?.isEnabled) {
        console.log('   ⚠️  MAINTENANCE MODE IS ACTIVE - This will prevent login!');
      }
    }

    // Check current time vs working hours
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentHour = thailandTime.getHours();
    console.log(`   Current Thailand time: ${thailandTime.toLocaleString('th-TH')}`);
    console.log(`   Current hour: ${currentHour}`);
    
    // Default working hours are 6-16 based on middleware
    if (currentHour < 6 || currentHour >= 16) {
      console.log('   ⚠️  OUTSIDE WORKING HOURS (6:00-16:00) - This may prevent access!');
    } else {
      console.log('   ✅ Within working hours');
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

// Run the test
testSpecificLogin();
