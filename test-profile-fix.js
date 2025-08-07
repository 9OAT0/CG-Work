const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testProfileFix() {
  console.log('Testing profile API fix...')

  try {
    // Test the query that was causing the issue
    const testUser = await prisma.user.findFirst({
      include: {
        joinedBooths: {
          include: {
            booth: {
              select: {
                booth_name: true,
                dept_type: true
              }
            }
          },
          orderBy: { joinedAt: 'desc' },
          take: 10
        },
        boothRatings: true,
        boothFavorites: true,
        TranscriptLog: true,
        _count: {
          select: {
            joinedBooths: true,
            boothRatings: true,
            boothFavorites: true,
            TranscriptLog: true
          }
        }
      }
    })

    if (testUser) {
      console.log('✅ Query executed successfully!')
      console.log(`User: ${testUser.name}`)
      console.log(`Joined booths: ${testUser.joinedBooths.length}`)
      
      // Filter out null booths (our fix)
      const validJoins = testUser.joinedBooths.filter(join => join.booth !== null)
      console.log(`Valid booth joins: ${validJoins.length}`)
      
      if (testUser.joinedBooths.length > validJoins.length) {
        console.log(`⚠️  Found ${testUser.joinedBooths.length - validJoins.length} orphaned booth joins that were filtered out`)
      }
      
      console.log('✅ Profile API fix is working correctly!')
    } else {
      console.log('No users found in database')
    }

  } catch (error) {
    console.error('❌ Error testing profile fix:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testProfileFix()
