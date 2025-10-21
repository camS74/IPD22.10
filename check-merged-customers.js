const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'fp_database',
  password: '654883',
  port: 5432,
});

async function checkMergedCustomers() {
  try {
    console.log('🔍 Checking MERGED customers for Narek Koroukian (after applying merge rules)...');
    
    // First get the merge rules
    const mergeRulesQuery = `
      SELECT * FROM customer_merge_rules 
      WHERE salesrep = 'Narek Koroukian'
      ORDER BY created_at DESC
    `;
    
    const mergeRules = await pool.query(mergeRulesQuery);
    console.log(`Found ${mergeRules.rows.length} merge rules for Narek Koroukian\n`);
    
    // Get raw customer data
    const rawQuery = `
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
    
    const rawResult = await pool.query(rawQuery);
    console.log(`Raw customers: ${rawResult.rows.length}\n`);
    
    // Apply merge rules manually
    const mergedCustomers = {};
    const processed = new Set();
    
    // Apply each merge rule
    mergeRules.rows.forEach(rule => {
      const mergedName = rule.merged_name;
      const originalCustomers = rule.original_customers || [];
      
      console.log(`Applying rule: ${mergedName} <- ${JSON.stringify(originalCustomers)}`);
      
      let totalAmount = 0;
      let totalKgs = 0;
      
      originalCustomers.forEach(originalName => {
        const rawCustomer = rawResult.rows.find(r => 
          r.customername.toLowerCase().trim() === originalName.toLowerCase().trim()
        );
        
        if (rawCustomer) {
          totalAmount += parseFloat(rawCustomer.total_amount || 0);
          totalKgs += parseFloat(rawCustomer.total_kgs || 0);
          processed.add(rawCustomer.customername);
          console.log(`  Found: ${rawCustomer.customername} -> $${parseFloat(rawCustomer.total_amount || 0).toLocaleString()}`);
        }
      });
      
      if (totalAmount > 0) {
        mergedCustomers[mergedName] = {
          name: mergedName,
          amount: totalAmount,
          kgs: totalKgs
        };
      }
    });
    
    // Add unprocessed customers
    rawResult.rows.forEach(rawCustomer => {
      if (!processed.has(rawCustomer.customername)) {
        mergedCustomers[rawCustomer.customername] = {
          name: rawCustomer.customername,
          amount: parseFloat(rawCustomer.total_amount || 0),
          kgs: parseFloat(rawCustomer.total_kgs || 0)
        };
      }
    });
    
    console.log(`\n📊 MERGED Customers (should be 6): ${Object.keys(mergedCustomers).length}\n`);
    
    const sortedMerged = Object.values(mergedCustomers).sort((a, b) => b.amount - a.amount);
    
    sortedMerged.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}`);
      console.log(`   Amount: $${customer.amount.toLocaleString()}`);
      console.log(`   KGS: ${customer.kgs.toLocaleString()} kg\n`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkMergedCustomers();

