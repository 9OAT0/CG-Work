const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSpecificIssue() {
  try {
    console.log('🔍 Debugging the specific registration issue...');
    
    // Check if there are any users with student_id that might be causing conflicts
    console.log('\n1. Checking all users with student_id values:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        student_id: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.status}) - student_id: ${user.student_id} - Created: ${user.createdAt}`);
    });

    // Check for any empty string student_id values
    console.log('\n2. Checking for empty string student_id values:');
    const emptyStringUsers = await prisma.user.findMany({
      where: {
        student_id: ""
      }
    });
    console.log(`Found ${emptyStringUsers.length} users with empty string student_id`);

    // Check for any undefined student_id values (this might not work in MongoDB)
    console.log('\n3. Checking database indexes:');
    
    // Let's try to create a test user to see what exactly happens
    console.log('\n4. Testing user creation with null student_id:');
    
    try {
      const testUser = await prisma.user.create({
        data: {
          username: `test-${Date.now()}`,
          status: 'นักเรียน',
          role: 'user',
          name: `Test User ${Date.now()}`,
          dept: 'โรงเรียนสาธิตมหาวิทยาลัยพะเยา'
          // Note: No student_id field at all
        }
      });
      console.log('✅ Successfully created test user without student_id:', testUser.id);
      
      // Clean up the test user
      await prisma.user.delete({
        where: { id: testUser.id }
      });
      console.log('🧹 Cleaned up test user');
      
    } catch (error) {
      console.log('❌ Failed to create test user:', error.message);
      if (error.code === 'P2002') {
        console.log('Unique constraint details:', error.meta);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSpecificIssue();
