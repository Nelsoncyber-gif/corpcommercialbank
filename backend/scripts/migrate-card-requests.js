const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting card requests migration...');
    
    // Add new columns to card_requests table
    console.log('📝 Adding columns to card_requests table...');
    
    const cardRequestsColumns = [
      'ALTER TABLE card_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ',
      'ALTER TABLE card_requests ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id)'
    ];
    
    for (const sql of cardRequestsColumns) {
      try {
        await client.query(sql);
        console.log('✅ Executed:', sql.substring(0, 60) + '...');
      } catch (err) {
        console.log('⚠️ Column may already exist:', err.message);
      }
    }
    
    console.log('✅ Card requests migration completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();


