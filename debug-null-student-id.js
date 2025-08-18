const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugNullStudentId() {
  try {
    console.log('🔍 Checking for users with null student_id...');
    
    // Find all users with null student_id
    const usersWithNullStudentId = await prisma.user.findMany({
      where: {
        student_id: null
      },
      select: {
        id: true,
        name: true,
        status: true,
        student_id: true,
        createdAt: true
      }
    });

    console.log(`Found ${usersWithNullStudentId.length} users with null student_id:`);
    usersWithNullStudentId.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.status}) - Created: ${user.createdAt}`);
    });

    // Check for any duplicate names among non-students
    console.log('\n🔍 Checking for duplicate names among non-students...');
    const nonStudents = await prisma.user.findMany({
      where: {
        status: { not: 'นิสิต' },
        student_id: null
      },
      select: {
        name: true,
        status: true
      }
    });

    const nameCount = {};
    nonStudents.forEach(user => {
      const key = `${user.name}-${user.status}`;
      nameCount[key] = (nameCount[key] || 0) + 1;
    });

    const duplicates = Object.entries(nameCount).filter(([key, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('Found duplicate name-status combinations:');
      duplicates.forEach(([key, count]) => {
        console.log(`- ${key}: ${count} times`);
      });
    } else {
      console.log('No duplicate name-status combinations found.');
    }

    // Check specifically for 'test boyz' with status 'นักเรียน'
    console.log('\n🔍 Checking for "test boyz" with status "นักเรียน"...');
    const testBoyz = await prisma.user.findMany({
      where: {
        name: 'test boyz',
        status: 'นักเรียน'
      }
    });

    if (testBoyz.length > 0) {
      console.log(`Found ${testBoyz.length} users named "test boyz" with status "นักเรียน":`);
      testBoyz.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, student_id: ${user.student_id}, Created: ${user.createdAt}`);
      });
    } else {
      console.log('No users named "test boyz" with status "นักเรียน" found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugNullStudentId();
