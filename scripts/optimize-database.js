#!/usr/bin/env node

// Database optimization script
// This script adds performance indexes to improve query speed

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load .env file manually
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.log('Could not load .env file:', error.message);
  }
}

async function addIndexes() {
  // Load environment variables
  loadEnv();
  
  // Get DATABASE_URL from environment or use default
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }

  const client = new MongoClient(DATABASE_URL);
  
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
    throw error;
  } finally {
    await client.close();
  }
}

async function main() {
  console.log('🚀 Starting database optimization...');
  console.log('This will add indexes to improve profile page performance');
  
  try {
    await addIndexes();
    console.log('✅ Database optimization completed successfully!');
    console.log('📈 Profile page should now load faster');
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  }
}

main();
