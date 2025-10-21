// Check 2025 countries directly from database
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ipdash',
  password: process.env.DB_PASSWORD || 'postgres',
  port: 5432,
});

async function check2025Countries() {
  try {
    console.log('🔍 Checking 2025 countries from database...');
    
    // Check what years and months exist in fp_data_excel
    const yearQuery = `
      SELECT DISTINCT year, month, COUNT(*) as country_count
      FROM fp_data_excel 
      WHERE year IN (2024, 2025)
      GROUP BY year, month 
      ORDER BY year, month
    `;
    
    const yearResult = await pool.query(yearQuery);
    console.log('\n📅 Available years and months:');
    yearResult.rows.forEach(row => {
      console.log(`${row.year}-${String(row.month).padStart(2, '0')}: ${row.country_count} countries`);
    });
    
    // Get all countries for 2025
    const countriesQuery = `
      SELECT DISTINCT countryname, COUNT(*) as record_count
      FROM fp_data_excel 
      WHERE year = 2025 AND month IN (1, 2, 3, 4, 5, 6)
      GROUP BY countryname
      ORDER BY countryname
    `;
    
    const countriesResult = await pool.query(countriesQuery);
    console.log(`\n🌍 Found ${countriesResult.rows.length} countries for 2025:`);
    countriesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.countryname} (${row.record_count} records)`);
    });
    
    // Also check 2024 for comparison
    const countries2024Query = `
      SELECT DISTINCT countryname, COUNT(*) as record_count
      FROM fp_data_excel 
      WHERE year = 2024 AND month IN (1, 2, 3, 4, 5, 6)
      GROUP BY countryname
      ORDER BY countryname
    `;
    
    const countries2024Result = await pool.query(countries2024Query);
    console.log(`\n🌍 Found ${countries2024Result.rows.length} countries for 2024:`);
    countries2024Result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.countryname} (${row.record_count} records)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

check2025Countries();
