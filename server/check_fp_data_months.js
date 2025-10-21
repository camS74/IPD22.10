const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '654883',
});

async function checkUniqueMonths() {
  try {
    console.log('Checking unique months in fp_data table...');
    
    const client = await pool.connect();
    
    // Get unique months
    const monthsResult = await client.query(`
      SELECT DISTINCT month 
      FROM fp_data 
      WHERE month IS NOT NULL 
      ORDER BY month
    `);
    
    console.log('\n📅 Unique Months in fp_data table:');
    console.log('=====================================');
    monthsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. "${row.month}"`);
    });
    
    console.log(`\nTotal unique months: ${monthsResult.rows.length}`);
    
    // Get some additional info about the data
    const countResult = await client.query('SELECT COUNT(*) FROM fp_data');
    console.log(`Total records in fp_data: ${countResult.rows[0].count}`);
    
    // Get sample data to see the month format
    const sampleResult = await client.query(`
      SELECT DISTINCT month, year, type 
      FROM fp_data 
      WHERE month IS NOT NULL 
      ORDER BY year, month 
      LIMIT 10
    `);
    
    console.log('\n📊 Sample Month Data:');
    console.log('======================');
    sampleResult.rows.forEach(row => {
      console.log(`Year: ${row.year}, Month: "${row.month}", Type: ${row.type}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking months:', error.message);
  } finally {
    await pool.end();
  }
}

checkUniqueMonths(); 