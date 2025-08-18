const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRegistration() {
  try {
    const users = await prisma.user.findMany({
      where: { 
        name: 'test',
        status: 'นักเรียน'
      },
      select: { name: true, status: true, student_id: true, createdAt: true }
    });
    
    console.log('Users named "test" with status "นักเรียน":');
    users.forEach(user => {
      console.log(`- Name: ${user.name}, Status: ${user.status}, Student ID: ${user.student_id || 'NULL'}, Created: ${user.createdAt}`);
    });
    
    if (users.length > 0) {
      console.log('\n✅ REGISTRATION WAS SUCCESSFUL!');
    } else {
      console.log('\n❌ No registration found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRegistration();
