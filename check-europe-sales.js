const { fpPool } = require('./server/database/fp_database_config');

async function checkEuropeSales() {
  try {
    // Check all countries with sales in HY1 2025
    const query = `
      SELECT 
        countryname,
        SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_sales
      FROM fp_data_excel
      WHERE year = 2025 
        AND month IN (1,2,3,4,5,6)
        AND UPPER(type) = 'ACTUAL'
      GROUP BY countryname
      HAVING SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) > 0
      ORDER BY total_sales DESC
    `;
    
    const result = await fpPool.query(query);
    console.log('All countries with sales in HY1 2025:');
    result.rows.forEach(row => {
      console.log(`- ${row.countryname}: ${row.total_sales}`);
    });
    
    console.log('\n--- Europe-related countries ---');
    const europeCountries = result.rows.filter(row => {
      const country = row.countryname.toLowerCase();
      return country.includes('united kingdom') || 
             country.includes('uk') || 
             country.includes('britain') ||
             country.includes('england') ||
             country.includes('germany') ||
             country.includes('france') ||
             country.includes('italy') ||
             country.includes('spain') ||
             country.includes('netherlands') ||
             country.includes('belgium');
    });
    
    if (europeCountries.length > 0) {
      europeCountries.forEach(row => {
        console.log(`- ${row.countryname}: ${row.total_sales}`);
      });
    } else {
      console.log('No Europe-related countries found in HY1 2025 data');
    }
    
    await fpPool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkEuropeSales();






















