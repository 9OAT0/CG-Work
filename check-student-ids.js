const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudentIds() {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'นิสิต' },
      select: { name: true, student_id: true }
    });
    
    console.log('All student registrations:');
    users.forEach(user => {
      console.log(`- ${user.name}: ${user.student_id}`);
    });
    
    // Check for any empty or null student IDs
    const emptyIds = users.filter(u => !u.student_id || u.student_id.trim() === '');
    if (emptyIds.length > 0) {
      console.log('\nStudents with empty/null IDs:');
      emptyIds.forEach(user => console.log(`- ${user.name}`));
    }
    
    // Check for potential duplicates
    const studentIds = users.map(u => u.student_id).filter(id => id);
    const duplicates = studentIds.filter((id, index) => studentIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.log('\nDuplicate student IDs found:');
      duplicates.forEach(id => console.log(`- ${id}`));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentIds();
