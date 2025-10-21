const { Pool } = require('pg');

async function debugMergeRules() {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fp_database',
    password: '654883',
    port: 5432,
  });

  try {
    console.log('🔍 Debugging merge rules for Narek...\n');

    // Check all merge rules for Narek (case insensitive)
    const result = await pool.query(`
      SELECT sales_rep, merged_customer_name, original_customers, is_active 
      FROM customer_merge_rules 
      WHERE LOWER(sales_rep) LIKE '%narek%'
    `);
    
    console.log(`📋 Found ${result.rows.length} merge rules for Narek:`);
    result.rows.forEach((rule, index) => {
      console.log(`${index + 1}. Sales Rep: "${rule.sales_rep}"`);
      console.log(`   Merged Name: "${rule.merged_customer_name}"`);
      console.log(`   Original Customers: ${JSON.stringify(rule.original_customers)}`);
      console.log(`   Is Active: ${rule.is_active}`);
      console.log('');
    });

    // Check if any are inactive
    const inactiveResult = await pool.query(`
      SELECT COUNT(*) as inactive_count 
      FROM customer_merge_rules 
      WHERE LOWER(sales_rep) LIKE '%narek%' AND is_active = false
    `);
    
    console.log(`❌ Inactive merge rules: ${inactiveResult.rows[0].inactive_count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugMergeRules();
