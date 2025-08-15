const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugRegistration() {
  try {
    console.log('=== DEBUG REGISTRATION ISSUE ===\n');
    
    // Check all users with name "test"
    const testUsers = await prisma.user.findMany({
      where: { name: 'test' },
      select: { id: true, name: true, student_id: true, status: true, username: true }
    });
    
    console.log('Users with name "test":');
    if (testUsers.length === 0) {
      console.log('- No users found with name "test"');
    } else {
      testUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Student ID: ${user.student_id || 'NULL'}`);
        console.log(`   Username: ${user.username}`);
        console.log('');
      });
    }
    
    // Check for any users with null student_id and status "นักเรียน"
    const schoolStudents = await prisma.user.findMany({
      where: { 
        status: 'นักเรียน',
        student_id: null
      },
      select: { name: true, status: true, student_id: true }
    });
    
    console.log('School students (นักเรียน) with null student_id:');
    if (schoolStudents.length === 0) {
      console.log('- No school students found');
    } else {
      schoolStudents.forEach(user => {
        console.log(`- ${user.name} (${user.status})`);
      });
    }
    
    // Test the exact registration data
    console.log('\n=== TESTING REGISTRATION LOGIC ===');
    const testData = {
      status: 'นักเรียน',
      name: 'test',
      dept: 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ'
    };
    
    console.log('Test data:', testData);
    
    // Check if this would conflict
    const existingUser = await prisma.user.findFirst({
      where: { 
        name: testData.name.trim(),
        student_id: null,
        status: { not: 'นิสิต' }
      }
    });
    
    if (existingUser) {
      console.log('CONFLICT FOUND:');
      console.log(`- Existing user: ${existingUser.name} (${existingUser.status})`);
    } else {
      console.log('NO CONFLICT - Registration should work');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRegistration();
