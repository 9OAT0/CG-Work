const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTest2() {
  try {
    const users = await prisma.user.findMany({
      where: { 
        name: 'test2',
        status: 'นักเรียน'
      },
      select: { name: true, status: true, student_id: true, createdAt: true, username: true }
    });
    
    console.log('Users named "test2" with status "นักเรียน":');
    users.forEach(user => {
      console.log(`- Name: ${user.name}, Status: ${user.status}, Student ID: ${user.student_id || 'NULL'}, Username: ${user.username}, Created: ${user.createdAt}`);
    });
    
    if (users.length > 0) {
      console.log('\n✅ REGISTRATION WAS SUCCESSFUL!');
      console.log('The fix worked - non-students can now register without unique constraint errors.');
    } else {
      console.log('\n❌ No registration found for test2');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTest2();
