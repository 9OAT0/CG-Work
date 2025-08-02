const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupOrphanedRecords() {
  console.log('Starting cleanup of orphaned records...')

  try {
    // Get all existing booth IDs
    const existingBoothIds = await prisma.booth.findMany({
      select: { id: true }
    }).then(booths => booths.map(b => b.id))

    console.log(`Found ${existingBoothIds.length} existing booths`)

    // Find and delete orphaned BoothJoin records
    const orphanedJoins = await prisma.boothJoin.findMany({
      where: {
        boothId: { notIn: existingBoothIds }
      }
    })

    console.log(`Found ${orphanedJoins.length} orphaned BoothJoin records`)

    if (orphanedJoins.length > 0) {
      const deletedJoins = await prisma.boothJoin.deleteMany({
        where: {
          boothId: { notIn: existingBoothIds }
        }
      })
      console.log(`Deleted ${deletedJoins.count} orphaned BoothJoin records`)
    }

    // Find and delete orphaned BoothRating records
    const orphanedRatings = await prisma.boothRating.findMany({
      where: {
        boothId: { notIn: existingBoothIds }
      }
    })

    console.log(`Found ${orphanedRatings.length} orphaned BoothRating records`)

    if (orphanedRatings.length > 0) {
      const deletedRatings = await prisma.boothRating.deleteMany({
        where: {
          boothId: { notIn: existingBoothIds }
        }
      })
      console.log(`Deleted ${deletedRatings.count} orphaned BoothRating records`)
    }

    // Find and delete orphaned BoothComment records
    const orphanedComments = await prisma.boothComment.findMany({
      where: {
        boothId: { notIn: existingBoothIds }
      }
    })

    console.log(`Found ${orphanedComments.length} orphaned BoothComment records`)

    if (orphanedComments.length > 0) {
      const deletedComments = await prisma.boothComment.deleteMany({
        where: {
          boothId: { notIn: existingBoothIds }
        }
      })
      console.log(`Deleted ${deletedComments.count} orphaned BoothComment records`)
    }

    // Find and delete orphaned BoothFavorite records
    const orphanedFavorites = await prisma.boothFavorite.findMany({
      where: {
        boothId: { notIn: existingBoothIds }
      }
    })

    console.log(`Found ${orphanedFavorites.length} orphaned BoothFavorite records`)

    if (orphanedFavorites.length > 0) {
      const deletedFavorites = await prisma.boothFavorite.deleteMany({
        where: {
          boothId: { notIn: existingBoothIds }
        }
      })
      console.log(`Deleted ${deletedFavorites.count} orphaned BoothFavorite records`)
    }

    // Find and delete orphaned BoothOwner records
    const orphanedOwners = await prisma.boothOwner.findMany({
      where: {
        boothId: { notIn: existingBoothIds }
      }
    })

    console.log(`Found ${orphanedOwners.length} orphaned BoothOwner records`)

    if (orphanedOwners.length > 0) {
      const deletedOwners = await prisma.boothOwner.deleteMany({
        where: {
          boothId: { notIn: existingBoothIds }
        }
      })
      console.log(`Deleted ${deletedOwners.count} orphaned BoothOwner records`)
    }

    console.log('✅ Cleanup completed successfully!')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOrphanedRecords()
