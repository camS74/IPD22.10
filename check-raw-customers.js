const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'fp_database',
  password: '654883',
  port: 5432,
});

async function checkRawCustomers() {
  try {
    console.log('🔍 Checking RAW customers for Narek Koroukian (before merging)...');
    
    const query = `
      SELECT 
        customername,
        SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_amount,
        COUNT(DISTINCT customername) as customer_count
      FROM fp_data_excel
      WHERE TRIM(UPPER(salesrepname)) = 'NAREK KOROUKIAN'
        AND year = 2025
        AND month IN (1, 2, 3, 4, 5, 6)
        AND UPPER(type) = 'ACTUAL'
        AND customername IS NOT NULL
        AND TRIM(customername) != ''
      GROUP BY customername
      ORDER BY total_amount DESC
    `;
    
    const result = await pool.query(query);
    
    console.log(`\n📊 RAW Customers (before merging): ${result.rows.length}\n`);
    
    result.rows.forEach((row, index) => {
      const amount = parseFloat(row.total_amount || 0);
      console.log(`${index + 1}. ${row.customername}`);
      console.log(`   Amount: $${amount.toLocaleString()}\n`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkRawCustomers();

