const { MongoClient } = require('mongodb');

async function fixDatabaseIndexes() {
  // Read DATABASE_URL from .env file manually
  const fs = require('fs');
  const envContent = fs.readFileSync('.env', 'utf8');
  const databaseUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
  const databaseUrl = databaseUrlLine.split('=')[1].replace(/"/g, '').trim();
  
  const client = new MongoClient(databaseUrl);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('User');
    
    // List all indexes
    console.log('\n📋 Current indexes on User collection:');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });
    
    // Check for student_id unique index
    const studentIdIndex = indexes.find(index => 
      index.key && index.key.student_id && index.unique
    );
    
    if (studentIdIndex) {
      console.log(`\n🔍 Found unique index on student_id: ${studentIdIndex.name}`);
      console.log('🗑️ Dropping unique index...');
      
      try {
        await collection.dropIndex(studentIdIndex.name);
        console.log('✅ Successfully dropped unique index on student_id');
      } catch (error) {
        console.log('❌ Failed to drop index:', error.message);
      }
    } else {
      console.log('\n✅ No unique index found on student_id field');
    }
    
    // Test creating users with null student_id
    console.log('\n🧪 Testing user creation with null student_id...');
    
    try {
      // Try to insert two users with null student_id
      const testUser1 = {
        username: `test-${Date.now()}`,
        status: 'นักเรียน',
        role: 'user',
        name: `Test User ${Date.now()}`,
        dept: 'โรงเรียนสาธิตมหาวิทยาลัยพะเยา',
        student_id: null,
        createdAt: new Date()
      };
      
      const result1 = await collection.insertOne(testUser1);
      console.log('✅ Successfully inserted first test user:', result1.insertedId);
      
      const testUser2 = {
        username: `test-2-${Date.now()}`,
        status: 'นักเรียน',
        role: 'user',
        name: `Test User 2 ${Date.now()}`,
        dept: 'โรงเรียนสาธิตมหาวิทยาลัยพะเยา',
        student_id: null,
        createdAt: new Date()
      };
      
      const result2 = await collection.insertOne(testUser2);
      console.log('✅ Successfully inserted second test user:', result2.insertedId);
      
      // Clean up test users
      await collection.deleteOne({ _id: result1.insertedId });
      await collection.deleteOne({ _id: result2.insertedId });
      console.log('🧹 Cleaned up test users');
      
    } catch (error) {
      console.log('❌ Failed to insert test users:', error.message);
      if (error.code === 11000) {
        console.log('This confirms there is still a unique constraint issue');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixDatabaseIndexes();
