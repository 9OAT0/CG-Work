const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugFinalIssue() {
  try {
    console.log('🔍 Final debugging of registration issue...');
    
    // Test creating a user without student_id field at all
    console.log('\n1. Testing user creation without student_id field:');
    try {
      const testUser1 = await prisma.user.create({
        data: {
          username: `test-no-student-id-${Date.now()}`,
          status: 'นักเรียน',
          role: 'user',
          name: `Test User No Student ID ${Date.now()}`,
          dept: 'โรงเรียนสาธิตมหาวิทยาลัยพะเยา'
          // No student_id field at all
        }
      });
      console.log('✅ Successfully created user without student_id:', testUser1.id);
      
      // Try creating another one
      const testUser2 = await prisma.user.create({
        data: {
          username: `test-no-student-id-2-${Date.now()}`,
          status: 'นักเรียน',
          role: 'user',
          name: `Test User No Student ID 2 ${Date.now()}`,
          dept: 'โรงเรียนสาธิตมหาวิทยาลัยพะเยา'
          // No student_id field at all
        }
      });
      console.log('✅ Successfully created second user without student_id:', testUser2.id);
      
      // Clean up
      await prisma.user.delete({ where: { id: testUser1.id } });
      await prisma.user.delete({ where: { id: testUser2.id } });
      console.log('🧹 Cleaned up test users');
      
    } catch (error) {
      console.log('❌ Failed to create user without student_id:', error.message);
      if (error.code === 'P2002') {
        console.log('Unique constraint details:', error.meta);
      }
    }

    // Test creating a user with explicit null student_id
    console.log('\n2. Testing user creation with explicit null student_id:');
    try {
      const testUser3 = await prisma.user.create({
        data: {
          username: `test-null-student-id-${Date.now()}`,
          status: 'นักเรียน',
          role: 'user',
          name: `Test User Null Student ID ${Date.now()}`,
          dept: 'โรงเรียนสาธิตมหาวิทยาลัยพะเยา',
          student_id: null // Explicit null
        }
      });
      console.log('✅ Successfully created user with null student_id:', testUser3.id);
      
      // Clean up
      await prisma.user.delete({ where: { id: testUser3.id } });
      console.log('🧹 Cleaned up test user');
      
    } catch (error) {
      console.log('❌ Failed to create user with null student_id:', error.message);
      if (error.code === 'P2002') {
        console.log('Unique constraint details:', error.meta);
      }
    }

    // Check current schema in generated client
    console.log('\n3. Checking generated Prisma client schema:');
    const generatedSchemaPath = './src/generated/prisma/schema.prisma';
    const fs = require('fs');
    if (fs.existsSync(generatedSchemaPath)) {
      const generatedSchema = fs.readFileSync(generatedSchemaPath, 'utf8');
      const studentIdLine = generatedSchema.split('\n').find(line => line.includes('student_id'));
      console.log('Generated schema student_id line:', studentIdLine);
    } else {
      console.log('Generated schema not found at expected path');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFinalIssue();
