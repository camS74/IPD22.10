const { Pool } = require('pg');

async function debugStepByStep() {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fp_database',
    password: '654883',
    port: 5432,
  });

  try {
    console.log('🔍 Step-by-step debugging...\n');

    // Step 1: Check all merge rules
    const allRules = await pool.query(`
      SELECT sales_rep, division, merged_customer_name, is_active 
      FROM customer_merge_rules 
      ORDER BY sales_rep, division
    `);
    
    console.log(`📋 All merge rules (${allRules.rows.length} total):`);
    allRules.rows.forEach((rule, index) => {
      console.log(`${index + 1}. Sales Rep: "${rule.sales_rep}", Division: "${rule.division}", Active: ${rule.is_active}`);
    });

    // Step 2: Check divisions
    const divisions = await pool.query(`
      SELECT DISTINCT division FROM customer_merge_rules ORDER BY division
    `);
    
    console.log(`\n📊 Available divisions:`);
    divisions.rows.forEach(row => {
      console.log(`- "${row.division}"`);
    });

    // Step 3: Check Narek specifically
    const narekRules = await pool.query(`
      SELECT sales_rep, division, merged_customer_name, is_active 
      FROM customer_merge_rules 
      WHERE LOWER(sales_rep) LIKE '%narek%'
    `);
    
    console.log(`\n🍯 Narek rules (${narekRules.rows.length} found):`);
    narekRules.rows.forEach((rule, index) => {
      console.log(`${index + 1}. Sales Rep: "${rule.sales_rep}", Division: "${rule.division}", Active: ${rule.is_active}`);
    });

    // Step 4: Test the exact query from the test script
    const testQuery = await pool.query(`
      SELECT * FROM customer_merge_rules 
      WHERE LOWER(sales_rep) LIKE '%narek%' AND division = $1 AND is_active = true
    `, ['FP']);
    
    console.log(`\n🧪 Test query result: ${testQuery.rows.length} rows`);
    testQuery.rows.forEach((rule, index) => {
      console.log(`${index + 1}. "${rule.merged_customer_name}": ${JSON.stringify(rule.original_customers)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugStepByStep();
