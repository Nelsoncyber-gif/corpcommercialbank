const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const { Pool } = require('pg');

// Create pool with proper SSL handling for both local and production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') 
    ? false 
    : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration...');

    // Add new columns to users table
    console.log('📝 Adding columns to users table...');

    const userColumns = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP',
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
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_country VARCHAR(100)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS backdated_by INTEGER REFERENCES users(id)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_date TIMESTAMP'
    ];

    for (const sql of transactionColumns) {
      try {
        await client.query(sql);
        console.log('✅ Executed:', sql.substring(0, 60) + '...');
      } catch (err) {
        console.log('⚠️ Column may already exist:', err.message);
      }
    }

    // Create missing tables
    console.log('📝 Creating missing tables...');

    const createTables = [
      `CREATE TABLE IF NOT EXISTS account_approvals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        account_number VARCHAR(20) UNIQUE,
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id),
        review_notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS card_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_type VARCHAR(50) DEFAULT 'Visa',
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id),
        review_notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_number VARCHAR(255) NOT NULL,
        card_holder_name VARCHAR(200) NOT NULL,
        expiry_date VARCHAR(10) NOT NULL,
        cvv VARCHAR(255) NOT NULL,
        card_type VARCHAR(50) DEFAULT 'Visa',
        status VARCHAR(20) DEFAULT 'pending',
        balance DECIMAL(15, 2) DEFAULT 0.00,
        daily_limit DECIMAL(15, 2) DEFAULT 1000.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of createTables) {
      try {
        await client.query(sql);
        console.log('✅ Table created:', sql.substring(0, 60).replace(/\n/g, ' ') + '...');
      } catch (err) {
        console.log('⚠️ Table may already exist:', err.message);
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
