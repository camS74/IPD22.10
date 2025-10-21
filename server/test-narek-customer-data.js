const { Pool } = require('pg');

async function testNarekCustomerData() {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fp_database',
    password: '654883',
    port: 5432,
  });

  try {
    console.log('🔍 Testing Customer Insights calculations for Narek, HY1 2025...\n');

    // First, check what sales reps exist
    const salesRepsResult = await pool.query(`
      SELECT DISTINCT salesrepname 
      FROM fp_data_excel
      WHERE salesrepname IS NOT NULL 
      AND TRIM(salesrepname) != ''
      AND salesrepname != '(blank)'
      ORDER BY salesrepname
    `);
    
    console.log('📋 Available Sales Reps:');
    salesRepsResult.rows.forEach(row => {
      console.log(`- ${row.salesrepname}`);
    });
    
    // Check if Narek exists (case insensitive)
    const narekResult = await pool.query(`
      SELECT DISTINCT salesrepname 
      FROM fp_data_excel
      WHERE LOWER(salesrepname) LIKE '%narek%'
    `);
    
    if (narekResult.rows.length === 0) {
      console.log('\n❌ No sales rep found with "Narek" in the name');
      return;
    }
    
    console.log('\n✅ Found Narek variations:');
    narekResult.rows.forEach(row => {
      console.log(`- ${row.salesrepname}`);
    });
    
    const narekName = narekResult.rows[0].salesrepname;
    console.log(`\n🔍 Using sales rep: "${narekName}"`);
    
    // Get customer data for Narek, HY1 2025
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
    `, [narekName]);
    
    const customerData = customerDataResult.rows;
    console.log(`\n📊 Found ${customerData.length} customers for ${narekName}, HY1 2025\n`);

    if (customerData.length === 0) {
      console.log('❌ No customer data found for HY1 2025');
      return;
    }

    console.log('📋 Customer Data (sorted by volume):');
    console.log('='.repeat(80));
    customerData.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.customername}: ${parseFloat(customer.total_values).toLocaleString()} KGS`);
    });
    console.log('='.repeat(80));

    // Calculate totals
    const totalVolume = customerData.reduce((sum, customer) => sum + parseFloat(customer.total_values), 0);
    console.log(`\n💰 Total Volume: ${totalVolume.toLocaleString()} KGS`);

    // Calculate percentages
    const topCustomer = customerData[0];
    const top3Customers = customerData.slice(0, 3);
    const top5Customers = customerData.slice(0, 5);

    const topCustomerPercentage = totalVolume > 0 ? (parseFloat(topCustomer.total_values) / totalVolume * 100) : 0;
    const top3Percentage = totalVolume > 0 ? (top3Customers.reduce((sum, c) => sum + parseFloat(c.total_values), 0) / totalVolume * 100) : 0;
    const top5Percentage = totalVolume > 0 ? (top5Customers.reduce((sum, c) => sum + parseFloat(c.total_values), 0) / totalVolume * 100) : 0;

    console.log('\n📈 Customer Insights Calculations:');
    console.log('='.repeat(50));
    console.log(`1. TOP CUSTOMER: ${topCustomerPercentage.toFixed(1)}% (${topCustomer.customername})`);
    console.log(`2. TOP 3 CUSTOMERS: ${top3Percentage.toFixed(1)}%`);
    console.log(`3. TOP 5 CUSTOMERS: ${top5Percentage.toFixed(1)}%`);
    console.log(`4. TOTAL CUSTOMERS: ${customerData.length}`);
    console.log(`5. AVG SALES PER CUSTOMER: ${(totalVolume / customerData.length).toLocaleString()} KGS`);

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
    console.log(`Total Customers: ${expectedTotalCustomers} vs ${customerData.length} - ${expectedTotalCustomers === customerData.length ? '✅' : '❌'}`);
    console.log(`Avg Sales: ${expectedAvgSales.toLocaleString()} vs ${(totalVolume / customerData.length).toLocaleString()} - ${Math.abs(expectedAvgSales - (totalVolume / customerData.length)) < 1000 ? '✅' : '❌'}`);

    // Calculate individual customer percentages for verification
    console.log('\n📊 Individual Customer Breakdown:');
    console.log('='.repeat(50));
    customerData.forEach((customer, index) => {
      const percentage = totalVolume > 0 ? (parseFloat(customer.total_values) / totalVolume * 100) : 0;
      console.log(`${index + 1}. ${customer.customername}: ${percentage.toFixed(1)}% (${parseFloat(customer.total_values).toLocaleString()} KGS)`);
    });

    // Check if top 5 customers account for 100% (meaning 6th customer has 0 sales)
    if (top5Percentage === 100.0 && customerData.length === 6) {
      console.log('\n💡 Analysis: Top 5 customers account for 100% of sales, meaning the 6th customer has 0 sales.');
      console.log('This explains why "TOTAL CUSTOMERS" shows 6 but "TOP 5 CUSTOMERS" shows 100%.');
    }

    // Check for customer growth (compare with HY1 2024)
    const previousYearResult = await pool.query(`
      SELECT 
        customername,
        SUM(values) as total_values
      FROM fp_data_excel
      WHERE salesrepname = $1
        AND year = 2024
        AND month IN (1, 2, 3, 4, 5, 6)
        AND UPPER(values_type) = 'KGS'
        AND UPPER(type) = 'ACTUAL'
        AND customername IS NOT NULL
        AND TRIM(customername) != ''
      GROUP BY customername
      HAVING SUM(values) > 0
    `, [narekName]);
    
    const previousYearCustomers = previousYearResult.rows.length;
    const currentYearCustomers = customerData.length;
    const customerGrowth = previousYearCustomers > 0 ? ((currentYearCustomers - previousYearCustomers) / previousYearCustomers * 100) : 0;
    
    console.log('\n📈 Customer Growth Analysis:');
    console.log('='.repeat(50));
    console.log(`HY1 2024 Customers: ${previousYearCustomers}`);
    console.log(`HY1 2025 Customers: ${currentYearCustomers}`);
    console.log(`Growth: ${customerGrowth.toFixed(1)}%`);
    
    // Find new customers
    const previousCustomerNames = new Set(previousYearResult.rows.map(r => r.customername.toLowerCase()));
    const newCustomers = customerData.filter(customer => 
      !previousCustomerNames.has(customer.customername.toLowerCase())
    );
    
    console.log(`\n🆕 New Customers in HY1 2025:`);
    newCustomers.forEach(customer => {
      console.log(`- ${customer.customername}: ${parseFloat(customer.total_values).toLocaleString()} KGS`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testNarekCustomerData();
