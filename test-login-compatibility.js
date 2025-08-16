async function testLoginCompatibility() {
  try {
    console.log('🧪 Testing login compatibility with registration fix...');
    
    // Test 1: Login for non-student (should work with users created by new registration)
    console.log('\n1. Testing non-student login...');
    const nonStudentLoginData = {
      student_id: '', // Empty string for non-students
      name: 'test boyz'
    };

    console.log('📤 Sending login request:', nonStudentLoginData);

    const response1 = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nonStudentLoginData)
    });

    const result1 = await response1.json();
    
    console.log('📥 Response status:', response1.status);
    console.log('📥 Response data:', result1);

    if (response1.ok) {
      console.log('✅ Non-student login successful!');
    } else {
      console.log('❌ Non-student login failed:', result1.error);
    }

    // Test 2: Login for student (should still work)
    console.log('\n2. Testing student login...');
    const studentLoginData = {
      student_id: '66002416', // Existing student ID from database
      name: 'testt001'
    };

    console.log('📤 Sending login request:', studentLoginData);

    const response2 = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentLoginData)
    });

    const result2 = await response2.json();
    
    console.log('📥 Response status:', response2.status);
    console.log('📥 Response data:', result2);

    if (response2.ok) {
      console.log('✅ Student login successful!');
    } else {
      console.log('❌ Student login failed:', result2.error);
    }

  } catch (error) {
    console.error('🚨 Test error:', error.message);
  }
}

testLoginCompatibility();
