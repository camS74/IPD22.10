const { Pool } = require('pg');

async function testNarekWithMergeRules() {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fp_database',
    password: '654883',
    port: 5432,
  });

  try {
    console.log('🔍 Testing Customer Insights with Merge Rules for Narek, HY1 2025...\n');

    // Get merge rules for Narek
    const mergeRulesResult = await pool.query(`
      SELECT * FROM customer_merge_rules 
      WHERE sales_rep = $1 AND division = $2 AND is_active = true
    `, ['NAREK KOROUKIAN', 'FP']);
    
    console.log(`📋 Found ${mergeRulesResult.rows.length} merge rules for Narek:`);
    mergeRulesResult.rows.forEach((rule, index) => {
      console.log(`${index + 1}. "${rule.merged_customer_name}": ${JSON.stringify(rule.original_customers)}`);
    });

    // Get raw customer data
    const customerDataResult = await pool.query(`
      SELECT 
        customername,
        SUM(values) as total_values
      FROM fp_data_excel
      WHERE salesrepname = $1
        AND year = 2025
        AND month IN (1, 2, 3, 4, 5, 6)
        AND UPPER(values_type) = 'KGS'
        AND UPPER(type) = 'ACTUAL'
        AND customername IS NOT NULL
        AND TRIM(customername) != ''
      GROUP BY customername
      HAVING SUM(values) > 0
      ORDER BY SUM(values) DESC
    `, ['NAREK KOROUKIAN']);
    
    const rawCustomers = customerDataResult.rows;
    console.log(`\n📊 Raw customer data (${rawCustomers.length} customers):`);
    rawCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.customername}: ${parseFloat(customer.total_values).toLocaleString()} KGS`);
    });

    // Apply merge rules
    const processedCustomers = [];
    const processed = new Set();
    
    // Apply each merge rule
    mergeRulesResult.rows.forEach(rule => {
      const originalCustomers = rule.original_customers;
      
      // Find matching customers (case-insensitive)
      const matchingCustomers = rawCustomers.filter(customer => 
        originalCustomers.some(orig => 
          customer.customername.toLowerCase().trim() === orig.toLowerCase().trim()
        ) && !processed.has(customer.customername.toLowerCase().trim())
      );
      
      if (matchingCustomers.length > 0) {
        // Merge these customers
        const mergedValue = matchingCustomers.reduce((sum, c) => sum + parseFloat(c.total_values), 0);
        
        processedCustomers.push({
          name: rule.merged_customer_name + '*',  // Add asterisk to show it's merged
          value: mergedValue,
          isMerged: true,
          originalCustomers: matchingCustomers.map(c => c.customername)
        });
        
        // Mark as processed
        matchingCustomers.forEach(c => processed.add(c.customername.toLowerCase().trim()));
        
        console.log(`\n✅ Merged ${matchingCustomers.length} customers into "${rule.merged_customer_name}": ${mergedValue.toLocaleString()} KGS`);
        matchingCustomers.forEach(c => {
          console.log(`   - ${c.customername}: ${parseFloat(c.total_values).toLocaleString()} KGS`);
        });
      }
    });
    
    // Add unprocessed customers
    rawCustomers.forEach(customer => {
      if (!processed.has(customer.customername.toLowerCase().trim())) {
        processedCustomers.push({
          name: customer.customername,
          value: parseFloat(customer.total_values),
          isMerged: false,
          originalCustomers: [customer.customername]
        });
      }
    });

    // Sort by value descending
    processedCustomers.sort((a, b) => b.value - a.value);

    console.log(`\n📈 Processed customer data (${processedCustomers.length} customers):`);
    console.log('='.repeat(80));
    processedCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}: ${customer.value.toLocaleString()} KGS ${customer.isMerged ? '(merged)' : ''}`);
    });
    console.log('='.repeat(80));

    // Calculate totals
    const totalVolume = processedCustomers.reduce((sum, customer) => sum + customer.value, 0);
    console.log(`\n💰 Total Volume: ${totalVolume.toLocaleString()} KGS`);

    // Calculate percentages
    const topCustomer = processedCustomers[0];
    const top3Customers = processedCustomers.slice(0, 3);
    const top5Customers = processedCustomers.slice(0, 5);

    const topCustomerPercentage = totalVolume > 0 ? (topCustomer.value / totalVolume * 100) : 0;
    const top3Percentage = totalVolume > 0 ? (top3Customers.reduce((sum, c) => sum + c.value, 0) / totalVolume * 100) : 0;
    const top5Percentage = totalVolume > 0 ? (top5Customers.reduce((sum, c) => sum + c.value, 0) / totalVolume * 100) : 0;

    console.log('\n📈 Customer Insights Calculations (with merge rules):');
    console.log('='.repeat(50));
    console.log(`1. TOP CUSTOMER: ${topCustomerPercentage.toFixed(1)}% (${topCustomer.name})`);
    console.log(`2. TOP 3 CUSTOMERS: ${top3Percentage.toFixed(1)}%`);
    console.log(`3. TOP 5 CUSTOMERS: ${top5Percentage.toFixed(1)}%`);
    console.log(`4. TOTAL CUSTOMERS: ${processedCustomers.length}`);
    console.log(`5. AVG SALES PER CUSTOMER: ${(totalVolume / processedCustomers.length).toLocaleString()} KGS`);

    // Verify the calculations from the image
    console.log('\n🔍 Verification against Image Data:');
    console.log('='.repeat(50));
    
    const expectedTopCustomer = 35.8;
    const expectedTop3 = 79.1;
    const expectedTop5 = 100.0;
    const expectedTotalCustomers = 6;
    const expectedAvgSales = 142000; // 142K

    console.log(`Expected vs Actual:`);
    console.log(`Top Customer: ${expectedTopCustomer}% vs ${topCustomerPercentage.toFixed(1)}% - ${Math.abs(expectedTopCustomer - topCustomerPercentage) < 0.1 ? '✅' : '❌'}`);
    console.log(`Top 3: ${expectedTop3}% vs ${top3Percentage.toFixed(1)}% - ${Math.abs(expectedTop3 - top3Percentage) < 0.1 ? '✅' : '❌'}`);
    console.log(`Top 5: ${expectedTop5}% vs ${top5Percentage.toFixed(1)}% - ${Math.abs(expectedTop5 - top5Percentage) < 0.1 ? '✅' : '❌'}`);
    console.log(`Total Customers: ${expectedTotalCustomers} vs ${processedCustomers.length} - ${expectedTotalCustomers === processedCustomers.length ? '✅' : '❌'}`);
    console.log(`Avg Sales: ${expectedAvgSales.toLocaleString()} vs ${(totalVolume / processedCustomers.length).toLocaleString()} - ${Math.abs(expectedAvgSales - (totalVolume / processedCustomers.length)) < 1000 ? '✅' : '❌'}`);

    // Calculate individual customer percentages for verification
    console.log('\n📊 Individual Customer Breakdown:');
    console.log('='.repeat(50));
    processedCustomers.forEach((customer, index) => {
      const percentage = totalVolume > 0 ? (customer.value / totalVolume * 100) : 0;
      console.log(`${index + 1}. ${customer.name}: ${percentage.toFixed(1)}% (${customer.value.toLocaleString()} KGS)`);
    });

    // Check if we need to exclude the 7th customer to match the image
    if (processedCustomers.length === 7 && processedCustomers[6].value < 1000) {
      console.log('\n💡 Analysis: The 7th customer has very low sales. Excluding it would match the image data.');
      console.log(`7th customer: ${processedCustomers[6].name}: ${processedCustomers[6].value.toLocaleString()} KGS`);
      
      // Recalculate with only top 6 customers
      const top6Customers = processedCustomers.slice(0, 6);
      const top6Volume = top6Customers.reduce((sum, c) => sum + c.value, 0);
      const top6Top5Percentage = top6Volume > 0 ? (top6Customers.slice(0, 5).reduce((sum, c) => sum + c.value, 0) / top6Volume * 100) : 0;
      
      console.log(`\n📊 If excluding 7th customer (${processedCustomers[6].name}):`);
      console.log(`Top 5 of 6 customers: ${top6Top5Percentage.toFixed(1)}%`);
      console.log(`Total Volume (6 customers): ${top6Volume.toLocaleString()} KGS`);
      console.log(`Avg Sales (6 customers): ${(top6Volume / 6).toLocaleString()} KGS`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testNarekWithMergeRules();
