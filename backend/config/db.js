const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;