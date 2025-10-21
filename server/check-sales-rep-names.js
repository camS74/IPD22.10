const { Pool } = require('pg');

async function checkSalesRepNames() {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fp_database',
    password: '654883',
    port: 5432,
  });

  try {
    console.log('🔍 Checking sales rep names in merge rules...\n');

    const result = await pool.query(`
      SELECT DISTINCT sales_rep 
      FROM customer_merge_rules 
      WHERE division = $1
      ORDER BY sales_rep
    `, ['FP']);
    
    console.log('📋 Sales reps with merge rules:');
    result.rows.forEach(row => {
      console.log(`- "${row.sales_rep}"`);
    });

    // Check if there's a case sensitivity issue
    const narekResult = await pool.query(`
      SELECT sales_rep, merged_customer_name, original_customers 
      FROM customer_merge_rules 
      WHERE division = $1 AND LOWER(sales_rep) LIKE '%narek%'
    `, ['FP']);
    
    console.log(`\n🍯 Narek-related merge rules (${narekResult.rows.length} found):`);
    narekResult.rows.forEach((rule, index) => {
      console.log(`${index + 1}. Sales Rep: "${rule.sales_rep}"`);
      console.log(`   Merged Name: "${rule.merged_customer_name}"`);
      console.log(`   Original Customers: ${JSON.stringify(rule.original_customers)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSalesRepNames();
