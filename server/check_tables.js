const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME, // Use the database from .env
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkTables() {
  try {
    console.log('Checking for fp_data table...');
    console.log(`Database: ${process.env.DB_NAME}`);
    
    const client = await pool.connect();
    
    // Check if fp_data table exists
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'fp_data'
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('✅ fp_data table exists');
      
      // Check table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'fp_data' 
        ORDER BY ordinal_position
      `);
      
      console.log('Table columns:');
      columnsResult.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
      
      // Check if there's any data
      const countResult = await client.query('SELECT COUNT(*) FROM fp_data');
      console.log(`Total records: ${countResult.rows[0].count}`);
      
    } else {
      console.log('❌ fp_data table does not exist');
      
      // List all tables
      const allTablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      console.log('Available tables:');
      allTablesResult.rows.forEach(row => {
        console.log(`  ${row.table_name}`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();