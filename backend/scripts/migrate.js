// backend/scripts/migrate.js
// Try multiple .env locations for local and Railway environments
require('dotenv').config({ path: './backend/.env' });
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');

// Parse DATABASE_URL and remove any sslmode parameters that conflict
let connectionString = process.env.DATABASE_URL;
if (connectionString) {
  // Remove sslmode from connection string to avoid conflicts
  connectionString = connectionString.replace(/[?&]sslmode=[^&]*/gi, '');
}

// SSL configuration for production databases (Railway, etc.)
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        dob DATE,
        phone VARCHAR(20),
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      -- Add other tables as needed
    `);
    console.log('✅ Migrations complete');
    await pool.end();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
