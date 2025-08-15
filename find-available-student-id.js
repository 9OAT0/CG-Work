const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAvailableStudentId() {
  try {
    console.log('🔍 Finding available student IDs...\n');
    
    // Get all existing student IDs
    const existingUsers = await prisma.user.findMany({
      where: { 
        status: 'นิสิต',
        student_id: { not: null }
      },
      select: { student_id: true, name: true }
    });
    
    const existingIds = existingUsers.map(u => u.student_id).sort();
    
    console.log('📋 Existing Student IDs:');
    existingIds.forEach(id => {
      const user = existingUsers.find(u => u.student_id === id);
      console.log(`- ${id} (${user.name})`);
    });
    
    console.log(`\n📊 Total registered students: ${existingIds.length}`);
    
    // Generate some available student IDs
    console.log('\n✅ Available Student IDs you can use for testing:');
    
    const currentYear = new Date().getFullYear() - 543; // Convert to Buddhist year
    const yearPrefix = currentYear.toString().slice(-2); // Get last 2 digits
    
    const suggestedIds = [];
    for (let i = 1; i <= 10; i++) {
      const testId = `${yearPrefix}${String(i).padStart(6, '0')}`;
      if (!existingIds.includes(testId)) {
        suggestedIds.push(testId);
      }
    }
    
    // Also try some random 8-digit numbers
    for (let i = 0; i < 5; i++) {
      const randomId = Math.floor(10000000 + Math.random() * 90000000).toString();
      if (!existingIds.includes(randomId)) {
        suggestedIds.push(randomId);
      }
    }
    
    suggestedIds.slice(0, 10).forEach(id => {
      console.log(`- ${id} ✅`);
    });
    
    console.log('\n💡 You can use any of these student IDs for new registrations.');
    console.log('📝 Note: Student IDs must be exactly 8 digits.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAvailableStudentId();
