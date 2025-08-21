const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function testDailyLoginsAPI() {
  console.log('🧪 Testing Daily Logins API...\n');

  try {
    // Test 1: Check if LoginHistory model exists
    console.log('1. Testing LoginHistory model...');
    const loginHistoryCount = await prisma.loginHistory.count();
    console.log(`   ✅ LoginHistory records: ${loginHistoryCount}`);

    // Test 2: Test the query that the API uses
    console.log('\n2. Testing daily login query...');
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    startOfDay.setTime(startOfDay.getTime() - (7 * 60 * 60 * 1000)); // Convert to UTC
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    endOfDay.setTime(endOfDay.getTime() - (7 * 60 * 60 * 1000)); // Convert to UTC

    console.log(`   Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // Test the exact query from the API
    const dailyLogins = await prisma.loginHistory.findMany({
      where: {
        loginDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        user: {
          select: {
            id: true,
            student_id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        loginDate: 'desc'
      }
    });

    console.log(`   ✅ Daily logins found: ${dailyLogins.length}`);

    // Test 3: Test groupBy query
    console.log('\n3. Testing groupBy query...');
    const uniqueUsers = await prisma.loginHistory.groupBy({
      by: ['userId'],
      where: {
        loginDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _count: {
        userId: true
      }
    });

    console.log(`   ✅ Unique users: ${uniqueUsers.length}`);

    // Test 4: Test user details query
    console.log('\n4. Testing user details query...');
    const userIds = uniqueUsers.map(u => u.userId);
    
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: userIds
          }
        },
        select: {
          id: true,
          student_id: true,
          name: true,
          role: true,
          lastLoginDate: true
        }
      });

      console.log(`   ✅ User details found: ${users.length}`);
    } else {
      console.log('   ⚠️  No users to query (no login history today)');
    }

    // Test 5: Check if we have any login history at all
    console.log('\n5. Checking overall login history...');
    const allLogins = await prisma.loginHistory.findMany({
      take: 5,
      orderBy: {
        loginDate: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });

    console.log(`   ✅ Recent logins (last 5):`);
    allLogins.forEach((login, index) => {
      console.log(`   ${index + 1}. ${login.user.name} (${login.user.role}) - ${login.loginDate.toISOString()}`);
    });

    // Test 6: Create a test login history entry for today
    console.log('\n6. Creating test login history entry...');
    
    // Find a user to create test data
    const testUser = await prisma.user.findFirst({
      where: {
        role: 'admin'
      }
    });

    if (testUser) {
      const testLogin = await prisma.loginHistory.create({
        data: {
          userId: testUser.id,
          loginDate: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Test User Agent'
        }
      });

      console.log(`   ✅ Created test login history: ${testLogin.id}`);

      // Now test the query again
      const dailyLoginsAfterTest = await prisma.loginHistory.findMany({
        where: {
          loginDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          user: {
            select: {
              id: true,
              student_id: true,
              name: true,
              role: true
            }
          }
        }
      });

      console.log(`   ✅ Daily logins after test entry: ${dailyLoginsAfterTest.length}`);
    } else {
      console.log('   ⚠️  No admin user found to create test data');
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDailyLoginsAPI();
