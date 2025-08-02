const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testProfileAPI() {
  console.log('Testing the updated profile API logic...')

  try {
    // Test the new approach - get user first
    const user = await prisma.user.findFirst({
      include: {
        TranscriptLog: true
      }
    })

    if (!user) {
      console.log('No users found in database')
      return
    }

    console.log(`Testing with user: ${user.name}`)

    // Test getting booth joins with booth data
    const allBoothJoins = await prisma.boothJoin.findMany({
      where: {
        userId: user.id
      },
      include: {
        booth: {
          select: {
            booth_name: true,
            dept_type: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    })

    console.log(`Found ${allBoothJoins.length} total booth joins`)

    // Filter out joins with null booths
    const validBoothJoins = allBoothJoins.filter(join => join.booth !== null).slice(0, 10)
    console.log(`Found ${validBoothJoins.length} valid booth joins`)

    if (allBoothJoins.length > validBoothJoins.length) {
      console.log(`⚠️  Filtered out ${allBoothJoins.length - validBoothJoins.length} orphaned booth joins`)
    }

    // Test getting existing booth IDs
    const existingBoothIds = await prisma.booth.findMany({
      select: { id: true }
    }).then(booths => booths.map(b => b.id))

    console.log(`Found ${existingBoothIds.length} existing booths`)

    // Test counts with existing booth IDs
    const [boothJoinCount, boothRatingCount, boothFavoriteCount] = await Promise.all([
      prisma.boothJoin.count({
        where: {
          userId: user.id,
          boothId: { in: existingBoothIds }
        }
      }),
      prisma.boothRating.count({
        where: {
          userId: user.id,
          boothId: { in: existingBoothIds }
        }
      }),
      prisma.boothFavorite.count({
        where: {
          userId: user.id,
          boothId: { in: existingBoothIds }
        }
      })
    ])

    console.log(`Valid counts - Joins: ${boothJoinCount}, Ratings: ${boothRatingCount}, Favorites: ${boothFavoriteCount}`)

    // Test recent activity calculation
    const recentActivity = validBoothJoins.map(join => ({
      type: 'join_booth',
      boothName: join.booth.booth_name,
      deptType: join.booth.dept_type,
      timestamp: join.joinedAt
    }))

    console.log(`Generated ${recentActivity.length} recent activity items`)

    console.log('✅ Profile API logic test completed successfully!')

  } catch (error) {
    console.error('❌ Error testing profile API:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testProfileAPI()
