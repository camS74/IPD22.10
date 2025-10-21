const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Connect to default postgres database first
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log(`Password: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
    
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ Database connection successful!');
    console.log('PostgreSQL version:', result.rows[0].version);
    client.release();
    
    // Test fp_data table exists
    const tableResult = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'fp_data'");
    if (tableResult.rows.length > 0) {
      console.log('✅ fp_data table exists');
    } else {
      console.log('❌ fp_data table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();