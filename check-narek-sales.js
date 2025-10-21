const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'fp_dashboard',
  password: 'postgres',
  port: 5432,
});

async function getNarekSales() {
  try {
    console.log('🔍 Getting sales data for Narek Koroukian - 2025 HY1 Actual...');
    
    const query = `
      SELECT 
        customername,
        SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_amount,
        SUM(CASE WHEN UPPER(values_type) = 'KGS' THEN values ELSE 0 END) as total_kgs
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
    
    console.log('\n📊 Sales Data for Narek Koroukian - 2025 HY1 Actual:');
    console.log(`Total Customers: ${result.rows.length}\n`);
    
    let totalAmount = 0;
    let totalKgs = 0;
    
    result.rows.forEach((row, index) => {
      const amount = parseFloat(row.total_amount || 0);
      const kgs = parseFloat(row.total_kgs || 0);
      totalAmount += amount;
      totalKgs += kgs;
      
      console.log(`${index + 1}. ${row.customername}`);
      console.log(`   Amount: $${amount.toLocaleString()}`);
      console.log(`   KGS: ${kgs.toLocaleString()} kg\n`);
    });
    
    console.log('\n📈 TOTALS:');
    console.log(`Total Amount: $${totalAmount.toLocaleString()}`);
    console.log(`Total KGS: ${totalKgs.toLocaleString()} kg`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

getNarekSales();

