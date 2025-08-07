// Test script to verify register auto-login functionality
const testRegisterAutoLogin = async () => {
  try {
    console.log('Testing register auto-login functionality...');
    
    const testData = {
      status: 'นิสิต',
      studentId: `TEST${Date.now()}`,
      name: 'Test User Auto Login',
      dept: 'คณะวิทยาศาสตร์'
    };

    const response = await fetch('http://localhost:3002/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    // Check if cookies are set
    const cookies = response.headers.get('set-cookie');
    console.log('Set-Cookie header:', cookies);
    
    if (response.ok && data.message.includes('เข้าสู่ระบบสำเร็จ')) {
      console.log('✅ SUCCESS: Register with auto-login works correctly!');
      console.log('✅ User created and automatically logged in');
      console.log('✅ JWT token should be set in cookie');
    } else {
      console.log('❌ FAILED: Register auto-login not working properly');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
};

// Run the test
testRegisterAutoLogin();
