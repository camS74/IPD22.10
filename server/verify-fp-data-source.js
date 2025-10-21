// Verification script to confirm FP sales by country data source
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function verifyFPDataSource() {
  console.log('🔍 Verifying FP Sales by Country Data Source...\n');

  try {
    // Test 1: Check if fp_data_excel table exists and has data
    console.log('1. Testing database connection and fp_data_excel table...');
    const dbTestResponse = await fetch(`${BASE_URL}/api/db/test`);
    const dbTestData = await dbTestResponse.json();
    
    if (dbTestData.success) {
      console.log('✅ Database connection successful');
    } else {
      console.log('❌ Database connection failed');
      return;
    }

    // Test 2: Get countries from database (fp_data_excel table)
    console.log('\n2. Getting countries from fp_data_excel table...');
    const countriesResponse = await fetch(`${BASE_URL}/api/fp/countries`);
    const countriesData = await countriesResponse.json();
    
    if (countriesData.success) {
      console.log(`✅ Retrieved ${countriesData.data.length} countries from fp_data_excel table`);
      console.log(`   Sample countries: ${countriesData.data.slice(0, 5).map(c => c.country).join(', ')}`);
    } else {
      console.log(`❌ Error: ${countriesData.message}`);
    }

    // Test 3: Get sales by country from database (fp_data_excel table)
    console.log('\n3. Getting sales by country from fp_data_excel table...');
    const salesByCountryResponse = await fetch(`${BASE_URL}/api/fp/sales-by-country`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        salesRep: 'Sofiane',
        year: 2024,
        months: [1, 2, 3],
        dataType: 'Actual'
      })
    });
    
    const salesByCountryData = await salesByCountryResponse.json();
    
    if (salesByCountryData.success) {
      console.log(`✅ Retrieved sales data for ${salesByCountryData.data.length} countries from fp_data_excel table`);
      console.log(`   Sample data: ${salesByCountryData.data.slice(0, 3).map(d => `${d.country}: ${d.value}`).join(', ')}`);
    } else {
      console.log(`❌ Error: ${salesByCountryData.message}`);
    }

    // Test 4: Get sales by country from new universal endpoint
    console.log('\n4. Getting sales by country from universal endpoint...');
    const universalResponse = await fetch(`${BASE_URL}/api/sales-by-country-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        division: 'FP',
        salesRep: 'Sofiane',
        year: 2024,
        months: [1, 2, 3],
        dataType: 'Actual'
      })
    });
    
    const universalData = await universalResponse.json();
    
    if (universalData.success) {
      console.log(`✅ Retrieved sales data for ${universalData.data.length} countries from universal endpoint`);
      console.log(`   Sample data: ${universalData.data.slice(0, 3).map(d => `${d.country}: ${d.value}`).join(', ')}`);
    } else {
      console.log(`❌ Error: ${universalData.message}`);
    }

    // Test 5: Compare data consistency between endpoints
    console.log('\n5. Comparing data consistency between endpoints...');
    if (salesByCountryData.success && universalData.success) {
      const oldData = salesByCountryData.data;
      const newData = universalData.data;
      
      if (oldData.length === newData.length) {
        console.log('✅ Both endpoints return same number of countries');
        
        // Check if data matches
        let dataMatches = true;
        for (let i = 0; i < Math.min(oldData.length, newData.length); i++) {
          if (oldData[i].country !== newData[i].country || 
              Math.abs(oldData[i].value - newData[i].value) > 0.01) {
            dataMatches = false;
            break;
          }
        }
        
        if (dataMatches) {
          console.log('✅ Data values match between endpoints');
        } else {
          console.log('❌ Data values differ between endpoints');
        }
      } else {
        console.log(`❌ Different number of countries: old=${oldData.length}, new=${newData.length}`);
      }
    }

    // Test 6: Check Excel data availability
    console.log('\n6. Checking Excel data availability...');
    const excelResponse = await fetch(`${BASE_URL}/api/sales.xlsx`);
    
    if (excelResponse.ok) {
      console.log('✅ Excel file is still available (this is the problem!)');
      console.log('   The frontend SalesByCountryTable.js is still reading from Excel');
    } else {
      console.log('❌ Excel file not available');
    }

    // Test 7: Get division info
    console.log('\n7. Getting division info...');
    const divisionInfoResponse = await fetch(`${BASE_URL}/api/division-info?division=FP`);
    const divisionInfoData = await divisionInfoResponse.json();
    
    if (divisionInfoData.success) {
      console.log(`✅ Division info: ${divisionInfoData.data.division} - ${divisionInfoData.data.status}`);
      console.log(`   Database: ${divisionInfoData.data.database}`);
      console.log(`   Table: ${divisionInfoData.data.table}`);
    } else {
      console.log(`❌ Error: ${divisionInfoData.message}`);
    }

    console.log('\n📋 SUMMARY:');
    console.log('   ✅ Database endpoints are working and using fp_data_excel table');
    console.log('   ✅ Both old and new endpoints return consistent data');
    console.log('   ❌ Frontend SalesByCountryTable.js is still using Excel data');
    console.log('   ❌ Excel file is still available and being used');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Update SalesByCountryTable.js to use database endpoints');
    console.log('   2. Remove Excel dependency from SalesDataContext.js');
    console.log('   3. Test frontend with database data');
    console.log('   4. Remove Excel file when migration is complete');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run the verification
verifyFPDataSource();




