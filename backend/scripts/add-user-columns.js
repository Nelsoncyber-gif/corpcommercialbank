require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addUserColumns() {
  const columns = [
    { name: 'address', type: 'VARCHAR(255)' },
    { name: 'city', type: 'VARCHAR(100)' },
    { name: 'state', type: 'VARCHAR(100)' },
    { name: 'zip_code', type: 'VARCHAR(20)' },
    { name: 'country', type: 'VARCHAR(100)' },
    { name: 'date_of_birth', type: 'DATE' },
    { name: 'occupation', type: 'VARCHAR(100)' },
    { name: 'tax_id', type: 'VARCHAR(50)' },
    { name: 'next_of_kin_name', type: 'VARCHAR(200)' },
    { name: 'next_of_kin_phone', type: 'VARCHAR(20)' },
    { name: 'next_of_kin_relationship', type: 'VARCHAR(50)' },
    { name: 'profile_picture', type: 'VARCHAR(500)' }
  ];

  for (const col of columns) {
    try {
      await pool.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
      );
      console.log(`✅ Added column: ${col.name}`);
    } catch (err) {
      console.error(`❌ Error adding column ${col.name}:`, err.message);
    }
  }

  console.log('\n✅ Migration complete!');
  process.exit(0);
}

addUserColumns().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
