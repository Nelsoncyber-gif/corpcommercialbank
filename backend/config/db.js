const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),  // Add String() here
  database: process.env.DB_NAME,
});

// Initialize database schema
const initializeSchema = async () => {
  try {
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          address VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(100),
          zip_code VARCHAR(20),
          country VARCHAR(100),
          date_of_birth DATE,
          occupation VARCHAR(100),
          tax_id VARCHAR(50),
          next_of_kin_name VARCHAR(200),
          next_of_kin_phone VARCHAR(20),
          next_of_kin_relationship VARCHAR(50),
          profile_picture TEXT,
          transaction_pin VARCHAR(255),
          role VARCHAR(20) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create accounts table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          account_number VARCHAR(20) UNIQUE,
          balance DECIMAL(15, 2) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create transactions table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          sender_account VARCHAR(20),
          receiver_account VARCHAR(20),
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create chat_messages table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          sender_type VARCHAR(20) NOT NULL DEFAULT 'user',
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for chat_messages
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
    `);

    // Add original_date column to transactions if it doesn't exist
    const originalDateResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'original_date'
    `);

    if (originalDateResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN original_date TIMESTAMP;`);
    }

    // Add bank_name column to transactions if it doesn't exist
    const bankNameResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'bank_name'
    `);

    if (bankNameResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN bank_name VARCHAR(255);`);
    }

    // Add receiver_name column to transactions if it doesn't exist
    const receiverNameResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'receiver_name'
    `);

    if (receiverNameResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN receiver_name VARCHAR(255);`);
    }

    // Add receiver_account_number column to transactions if it doesn't exist
    const receiverAccResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'receiver_account_number'
    `);

    if (receiverAccResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN receiver_account_number VARCHAR(20);`);
    }

    // Check if account_id column exists in transactions table, if not, add it
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'account_id'
    `);

    if (result.rows.length === 0) {
      // Add the account_id column if it doesn't exist
      await pool.query(`
        ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE;
      `);
    }

    // Check if other columns exist, add them if they don't
    const typeResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'type'
    `);

    if (typeResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN type VARCHAR(20);`);
    }

    const amountResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'amount'
    `);

    if (amountResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN amount DECIMAL(15, 2);`);
    }

    const senderResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'sender_account'
    `);

    if (senderResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN sender_account VARCHAR(20);`);
    }

    const receiverResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'receiver_account'
    `);

    if (receiverResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN receiver_account VARCHAR(20);`);
    }

    // Create indexes if they don't exist
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);`);
    } catch (e) {
      console.log('Index idx_accounts_user_id may already exist');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);`);
    } catch (e) {
      console.log('Index idx_transactions_account_id may already exist');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);`);
    } catch (e) {
      console.log('Index idx_transactions_created_at may already exist');
    }

    // Create card_requests table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS card_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_type VARCHAR(50) DEFAULT 'Visa',
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create cards table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_number TEXT,
        card_holder_name VARCHAR(100),
        expiry_date VARCHAR(5),
        cvv TEXT,
        card_type VARCHAR(50) DEFAULT 'Visa',
        status VARCHAR(20) DEFAULT 'active',
        balance DECIMAL(15,2) DEFAULT 0.00,
        daily_limit DECIMAL(15,2) DEFAULT 1000.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for cards
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_card_requests_user_id ON card_requests(user_id);`);
    } catch (e) {
      console.log('Card indexes may already exist');
    }

    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Error initializing database schema:', err);
  }
};

// Initialize schema and test connection
initializeSchema()
  .then(() => {
    pool.query('SELECT 1')
      .then(() => console.log('Connected to PostgreSQL database'))
      .catch(err => console.error('Database connection error:', err));
  })
  .catch(err => console.error('Schema initialization error:', err));

module.exports = pool;