const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testNewApproach() {
  console.log('Testing the new profile API approach...')

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

    // Get existing booth IDs first
    const existingBoothIds = await prisma.booth.findMany({
      select: { id: true }
    }).then(booths => booths.map(b => b.id))

    console.log(`Found ${existingBoothIds.length} existing booths`)

    // Get booth joins without include, filtering by existing booth IDs
    const allBoothJoins = await prisma.boothJoin.findMany({
      where: {
        userId: user.id,
        boothId: { in: existingBoothIds }
      },
      orderBy: { joinedAt: 'desc' },
      take: 10
    })

    console.log(`Found ${allBoothJoins.length} valid booth joins`)

    // Get booth data for the valid joins
    const boothIds = allBoothJoins.map(join => join.boothId)
    const booths = await prisma.booth.findMany({
      where: { id: { in: boothIds } },
      select: {
        id: true,
        booth_name: true,
        dept_type: true
      }
    })

    console.log(`Found ${booths.length} booth records`)

    // Create a map for quick booth lookup
    const boothMap = new Map(booths.map(booth => [booth.id, booth]))

    // Test recent activity calculation
    const recentActivity = allBoothJoins.map(join => {
      const booth = boothMap.get(join.boothId)
      return {
        type: 'join_booth',
        boothName: booth?.booth_name || 'Unknown Booth',
        deptType: booth?.dept_type || 'Unknown Department',
        timestamp: join.joinedAt
      }
    })

    console.log(`Generated ${recentActivity.length} recent activity items`)

    // Test counts
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

    console.log('✅ New profile API approach test completed successfully!')

  } catch (error) {
    console.error('❌ Error testing new approach:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testNewApproach()
