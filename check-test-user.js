const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestUser() {
  try {
    const users = await prisma.user.findMany({
      where: { name: 'test' },
      select: { name: true, student_id: true, status: true }
    });
    
    console.log('Users with name "test":');
    users.forEach(user => {
      console.log(`- Name: ${user.name}, Status: ${user.status}, Student ID: ${user.student_id || 'NULL'}`);
    });
    
    if (users.length === 0) {
      console.log('No users found with name "test"');
    }
    
    // Also check for similar names
    const similarUsers = await prisma.user.findMany({
      where: { 
        name: { contains: 'test' }
      },
      select: { name: true, student_id: true, status: true }
    });
    
    console.log('\nUsers with names containing "test":');
    similarUsers.forEach(user => {
      console.log(`- Name: ${user.name}, Status: ${user.status}, Student ID: ${user.student_id || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestUser();
