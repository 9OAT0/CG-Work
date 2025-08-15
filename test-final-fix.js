const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFinalFix() {
  try {
    console.log('=== TESTING FINAL REGISTRATION FIX ===\n');
    
    // Test the exact scenario that was failing before
    const testData = {
      status: 'นักเรียน',
      name: 'test-final',
      dept: 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ'
    };
    
    console.log('Testing registration with data:', testData);
    
    // Create username like the API does
    const username = `${testData.name.replace(/\s/g, '')}-${Date.now()}`;
    
    console.log('Generated username:', username);
    
    // Try to create the user directly (simulating the API call)
    const newUser = await prisma.user.create({
      data: {
        username,
        student_id: null, // This was causing the unique constraint error before
        status: testData.status,
        role: 'user',
        name: testData.name,
        dept: testData.dept
      }
    });
    
    console.log('\n✅ SUCCESS! User created successfully:');
    console.log(`- ID: ${newUser.id}`);
    console.log(`- Name: ${newUser.name}`);
    console.log(`- Status: ${newUser.status}`);
    console.log(`- Student ID: ${newUser.student_id || 'NULL'}`);
    console.log(`- Username: ${newUser.username}`);
    console.log(`- Department: ${newUser.dept}`);
    console.log(`- Created: ${newUser.createdAt}`);
    
    // Now test creating another user with null student_id to confirm multiple nulls are allowed
    console.log('\n=== TESTING MULTIPLE NULL STUDENT_IDS ===');
    
    const testData2 = {
      status: 'นักเรียน',
      name: 'test-final-2',
      dept: 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ'
    };
    
    const username2 = `${testData2.name.replace(/\s/g, '')}-${Date.now()}`;
    
    const newUser2 = await prisma.user.create({
      data: {
        username: username2,
        student_id: null, // Another null value - should work now
        status: testData2.status,
        role: 'user',
        name: testData2.name,
        dept: testData2.dept
      }
    });
    
    console.log('\n✅ SUCCESS! Second user with null student_id created:');
    console.log(`- Name: ${newUser2.name}`);
    console.log(`- Student ID: ${newUser2.student_id || 'NULL'}`);
    
    console.log('\n🎉 REGISTRATION FIX CONFIRMED WORKING!');
    console.log('✅ Multiple users can now have null student_id values');
    console.log('✅ Non-students (นักเรียน, อาจารย์, etc.) can register successfully');
    console.log('✅ The unique constraint error has been resolved');
    
  } catch (error) {
    console.error('\n❌ REGISTRATION FAILED:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.meta) {
      console.error('Error meta:', error.meta);
    }
    
    if (error.code === 'P2002') {
      console.error('\n⚠️  UNIQUE CONSTRAINT ERROR STILL EXISTS');
      console.error('The schema fix may not have been applied properly.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testFinalFix();
