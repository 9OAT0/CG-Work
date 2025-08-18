async function testRegistration() {
  try {
    console.log('🧪 Testing registration fix for non-students...');
    
    const testData = {
      status: 'นักเรียน',
      studentId: null, // This should be null for non-students
      name: 'test boyz',
      dept: 'โรงเรียนสาธิตมหาวิทยาลัยพะเยา'
    };

    console.log('📤 Sending registration request:', testData);

    const response = await fetch('http://localhost:3001/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', result);

    if (response.ok) {
      console.log('✅ Registration successful!');
      console.log('👤 New user created:', {
        id: result.user.id,
        name: result.user.name,
        status: result.user.status,
        student_id: result.user.student_id,
        dept: result.user.dept
      });
    } else {
      console.log('❌ Registration failed:', result.error);
    }

  } catch (error) {
    console.error('🚨 Test error:', error.message);
  }
}

testRegistration();
