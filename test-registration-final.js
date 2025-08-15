const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRegistration() {
  try {
    console.log('=== TESTING REGISTRATION AFTER SCHEMA FIX ===\n');
    
    // Test data - same as what the user was trying to register
    const testData = {
      status: 'นักเรียน',
      name: 'test',
      dept: 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ'
    };
    
    console.log('Test registration data:', testData);
    
    // Check if this would conflict (should not conflict now)
    const existingUser = await prisma.user.findFirst({
      where: { 
        name: testData.name.trim(),
        status: testData.status,
        student_id: null
      }
    });
    
    if (existingUser) {
      console.log('❌ CONFLICT FOUND:');
      console.log(`- Existing user: ${existingUser.name} (${existingUser.status})`);
      return;
    }
    
    console.log('✅ NO CONFLICT - Proceeding with registration');
    
    // Create username
    const username = `${testData.name.replace(/\s/g, '')}-${Date.now()}`;
    
    // Try to create the user
    const newUser = await prisma.user.create({
      data: {
        username,
        student_id: null, // For non-students
        status: testData.status,
        role: 'user',
        name: testData.name,
        dept: testData.dept
      }
    });
    
    console.log('✅ REGISTRATION SUCCESSFUL!');
    console.log('New user created:');
    console.log(`- ID: ${newUser.id}`);
    console.log(`- Name: ${newUser.name}`);
    console.log(`- Status: ${newUser.status}`);
    console.log(`- Student ID: ${newUser.student_id || 'NULL'}`);
    console.log(`- Username: ${newUser.username}`);
    console.log(`- Department: ${newUser.dept}`);
    
    // Verify the user was created
    const verifyUser = await prisma.user.findUnique({
      where: { id: newUser.id }
    });
    
    if (verifyUser) {
      console.log('\n✅ USER VERIFICATION SUCCESSFUL');
      console.log('User exists in database and can be retrieved');
    } else {
      console.log('\n❌ USER VERIFICATION FAILED');
    }
    
  } catch (error) {
    console.error('❌ REGISTRATION FAILED:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.meta) {
      console.error('Error meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testRegistration();
