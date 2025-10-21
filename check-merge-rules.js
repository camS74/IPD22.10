const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'fp_database',
  password: '654883',
  port: 5432,
});

async function checkMergeRules() {
  try {
    console.log('🔍 Checking merge rules for Narek Koroukian...');
    
    const query = `
      SELECT * FROM customer_merge_rules 
      WHERE salesrep = 'Narek Koroukian' OR salesrep = 'NAREK KOROUKIAN'
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    console.log(`\n📋 Merge Rules for Narek Koroukian: ${result.rows.length}\n`);
    
    if (result.rows.length > 0) {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. Rule ID: ${row.id}`);
        console.log(`   Sales Rep: ${row.salesrep}`);
        console.log(`   Merged Name: ${row.merged_name}`);
        console.log(`   Original Customers: ${JSON.stringify(row.original_customers)}`);
        console.log(`   Created: ${row.created_at}\n`);
      });
    } else {
      console.log('No merge rules found for Narek Koroukian.');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkMergeRules();

