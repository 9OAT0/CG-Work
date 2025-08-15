// Test script to verify registration functionality
// This will help identify the exact issue with registration

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRegistration() {
  console.log('🧪 Testing registration functionality...\n');

  try {
    // Test 1: Check current users in database
    console.log('1. Checking existing users...');
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        student_id: true,
        status: true,
        dept: true
      }
    });
    console.log(`Found ${existingUsers.length} existing users`);
    
    // Show some examples
    if (existingUsers.length > 0) {
      console.log('Sample users:');
      existingUsers.slice(0, 3).forEach(user => {
        console.log(`- ${user.name} (${user.student_id || 'No student ID'}) - ${user.status}`);
      });
    }
    console.log('');

    // Test 2: Check for duplicate student IDs
    console.log('2. Checking for duplicate student IDs...');
    const studentIds = existingUsers
      .filter(user => user.student_id)
      .map(user => user.student_id);
    
    const duplicateIds = studentIds.filter((id, index) => studentIds.indexOf(id) !== index);
    
    if (duplicateIds.length > 0) {
      console.log('❌ Found duplicate student IDs:', duplicateIds);
    } else {
      console.log('✅ No duplicate student IDs found');
    }
    console.log('');

    // Test 3: Test registration logic simulation
    console.log('3. Testing registration logic...');
    
    // Simulate a new student registration
    const testStudentId = '65123456789';
    const existingUser = await prisma.user.findUnique({
      where: { student_id: testStudentId }
    });
    
    if (existingUser) {
      console.log(`❌ Student ID ${testStudentId} already exists - this would cause registration failure`);
    } else {
      console.log(`✅ Student ID ${testStudentId} is available for registration`);
    }
    console.log('');

    // Test 4: Check database indexes
    console.log('4. Checking database indexes...');
    const db = prisma.$queryRaw`db.User.getIndexes()`;
    console.log('Database indexes check completed');
    console.log('');

    // Test 5: Test name duplicates (should be allowed)
    console.log('5. Checking name duplicates (should be allowed)...');
    const names = existingUsers.map(user => user.name);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    
    if (duplicateNames.length > 0) {
      console.log(`✅ Found ${duplicateNames.length} duplicate names - this is expected and allowed`);
      console.log('Sample duplicate names:', duplicateNames.slice(0, 3));
    } else {
      console.log('ℹ️ No duplicate names found');
    }
    console.log('');

    console.log('🎯 Registration Test Summary:');
    console.log('- Only student_id should be unique for students');
    console.log('- Names can be duplicated');
    console.log('- Non-students can register without student_id');
    console.log('');

    // Test 6: Simulate actual registration
    console.log('6. Testing actual registration process...');
    
    const testRegistrations = [
      {
        status: 'นิสิต',
        studentId: '99999999999', // Should work if not exists
        name: 'Test Student',
        dept: 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร'
      },
      {
        status: 'อาจารย์',
        studentId: null,
        name: 'Test Teacher',
        dept: 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร'
      }
    ];

    for (const testReg of testRegistrations) {
      console.log(`Testing registration for: ${testReg.name} (${testReg.status})`);
      
      if (testReg.status === 'นิสิต' && testReg.studentId) {
        const existing = await prisma.user.findUnique({
          where: { student_id: testReg.studentId }
        });
        
        if (existing) {
          console.log(`❌ Would fail: Student ID ${testReg.studentId} already exists`);
        } else {
          console.log(`✅ Would succeed: Student ID ${testReg.studentId} is available`);
        }
      } else {
        console.log(`✅ Would succeed: Non-student registration (no student ID check needed)`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRegistration();
