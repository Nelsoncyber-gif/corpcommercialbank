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
    console.log('🚀 Starting migration...');
    
    // Add new columns to users table
    console.log('📝 Adding columns to users table...');
    
    const userColumns = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP'
    ];
    
    for (const sql of userColumns) {
      try {
        await client.query(sql);
        console.log('✅ Executed:', sql.substring(0, 60) + '...');
      } catch (err) {
        console.log('⚠️ Column may already exist:', err.message);
      }
    }
    
    // Add new columns to transactions table
    console.log('📝 Adding columns to transactions table...');
    
    const transactionColumns = [
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(20) DEFAULT \'domestic\'',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS swift_code VARCHAR(50)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS beneficiary_address TEXT',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reason_for_transaction TEXT',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_country VARCHAR(100)'
    ];
    
    for (const sql of transactionColumns) {
      try {
        await client.query(sql);
        console.log('✅ Executed:', sql.substring(0, 60) + '...');
      } catch (err) {
        console.log('⚠️ Column may already exist:', err.message);
      }
    }
    
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
