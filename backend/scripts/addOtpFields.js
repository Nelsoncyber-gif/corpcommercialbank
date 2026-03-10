require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addOtpFields() {
  try {
    console.log('🔌 Connecting to database...');

    // Check if columns already exist
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('otp_code', 'otp_expiry', 'is_verified')
    `);

    if (columnCheck.rows.length === 3) {
      console.log('✅ OTP fields already exist');
    } else {
      console.log('➕ Adding OTP fields to users table...');
      
      // Add OTP fields if they don't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
        ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE
      `);
      
      console.log('✅ OTP fields added successfully');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

addOtpFields();