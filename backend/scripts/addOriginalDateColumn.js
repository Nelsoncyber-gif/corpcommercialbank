// backend/scripts/addOriginalDateColumn.js
// Migration script to add original_date column to transactions table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addOriginalDateColumn() {
  try {
    console.log('🔌 Connecting to database...');

    // Check if column already exists
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'original_date'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ original_date column already exists');
    } else {
      console.log('➕ Adding original_date column to transactions table...');
      await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN original_date TIMESTAMP
      `);
      console.log('✅ original_date column added successfully');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addOriginalDateColumn();
