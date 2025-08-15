// Performance optimization indexes for profile page queries
// Run this script to add indexes that will improve query performance

const { MongoClient } = require('mongodb');

async function addIndexes() {
  const client = new MongoClient(process.env.DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('Adding performance indexes...');
    
    // Index for BoothJoin queries by userId and joinedAt (for daily points calculation)
    await db.collection('BoothJoin').createIndex(
      { userId: 1, joinedAt: -1 },
      { name: 'userId_joinedAt_idx' }
    );
    
    // Index for BoothJoin queries by userId and boothId (for existence checks)
    await db.collection('BoothJoin').createIndex(
      { userId: 1, boothId: 1 },
      { name: 'userId_boothId_idx' }
    );
    
    // Index for TranscriptLog queries by userId
    await db.collection('TranscriptLog').createIndex(
      { userId: 1, date: -1 },
      { name: 'userId_date_idx' }
    );
    
    // Index for User queries by student_id (already unique, but ensure it's optimized)
    await db.collection('User').createIndex(
      { student_id: 1 },
      { name: 'student_id_idx', unique: true, sparse: true }
    );
    
    // Index for BoothRating queries by userId
    await db.collection('BoothRating').createIndex(
      { userId: 1, boothId: 1 },
      { name: 'userId_boothId_rating_idx' }
    );
    
    // Index for BoothFavorite queries by userId
    await db.collection('BoothFavorite').createIndex(
      { userId: 1, boothId: 1 },
      { name: 'userId_boothId_favorite_idx' }
    );
    
    console.log('Indexes added successfully!');
    
  } catch (error) {
    console.error('Error adding indexes:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  addIndexes();
}

module.exports = { addIndexes };
