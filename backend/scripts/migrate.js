// backend/scripts/migrate.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  try {
    console.log('🔌 Connecting to database...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        date_of_birth DATE,
        occupation VARCHAR(100),
        tax_id VARCHAR(50),
        phone VARCHAR(20),
        next_of_kin_name VARCHAR(100),
        next_of_kin_phone VARCHAR(20),
        next_of_kin_relationship VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        profile_picture TEXT,
        role VARCHAR(20) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT FALSE,
        transaction_pin VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        balance DECIMAL(15, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        sender_account VARCHAR(50),
        receiver_account VARCHAR(50),
        receiver_name VARCHAR(100),
        receiver_account_number VARCHAR(50),
        bank_name VARCHAR(100),
        description TEXT,
        original_date TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create card_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS card_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_type VARCHAR(50) DEFAULT 'Visa',
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create cards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_number TEXT NOT NULL,
        card_holder_name VARCHAR(100) NOT NULL,
        expiry_date VARCHAR(7) NOT NULL,
        cvv TEXT NOT NULL,
        card_type VARCHAR(50) DEFAULT 'Visa',
        status VARCHAR(20) DEFAULT 'inactive',
        balance DECIMAL(15, 2) DEFAULT 0.00,
        daily_limit DECIMAL(15, 2) DEFAULT 1000.00,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create account_approvals table (for admin approval workflow)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_approvals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by INTEGER REFERENCES users(id),
        review_notes TEXT
      );
    `);

    // Create chat_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_card_requests_user_id ON card_requests(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id)`);

    console.log('✅ Database tables created successfully');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigrations();
