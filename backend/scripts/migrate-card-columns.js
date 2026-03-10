const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') 
    ? false 
    : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration: Add review_notes to card_requests...');

    // Add review_notes column to card_requests table
    await client.query(`
      ALTER TABLE card_requests 
      ADD COLUMN IF NOT EXISTS review_notes TEXT
    `);

    console.log('✅ Added review_notes column to card_requests table');

    // Add reviewed_by column if it doesn't exist
    await client.query(`
      ALTER TABLE card_requests 
      ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id)
    `);

    console.log('✅ Added reviewed_by column to card_requests table');

    // Add reviewed_at column if it doesn't exist
    await client.query(`
      ALTER TABLE card_requests 
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP
    `);

    console.log('✅ Added reviewed_at column to card_requests table');

    console.log('✅ Migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
