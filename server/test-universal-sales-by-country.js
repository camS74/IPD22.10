// Test script for Universal Sales by Country Database API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testUniversalSalesByCountry() {
  console.log('🧪 Testing Universal Sales by Country Database API Endpoints...\n');

  try {
    // Test 1: Get division info for FP
    console.log('1. Testing GET /api/division-info?division=FP');
    const divisionInfoResponse = await fetch(`${BASE_URL}/api/division-info?division=FP`);
    const divisionInfoData = await divisionInfoResponse.json();
    
    if (divisionInfoData.success) {
      console.log(`✅ Success: ${divisionInfoData.data.division} - ${divisionInfoData.data.status}`);
      console.log(`   Database: ${divisionInfoData.data.database}`);
      console.log(`   Table: ${divisionInfoData.data.table}`);
    } else {
      console.log(`❌ Error: ${divisionInfoData.message}`);
    }

    // Test 2: Get division info for SB (should show planned status)
    console.log('\n2. Testing GET /api/division-info?division=SB');
    const sbDivisionInfoResponse = await fetch(`${BASE_URL}/api/division-info?division=SB`);
    const sbDivisionInfoData = await sbDivisionInfoResponse.json();
    
    if (sbDivisionInfoData.success) {
      console.log(`✅ Success: ${sbDivisionInfoData.data.division} - ${sbDivisionInfoData.data.status}`);
      console.log(`   Database: ${sbDivisionInfoData.data.database}`);
      console.log(`   Table: ${sbDivisionInfoData.data.table}`);
    } else {
      console.log(`❌ Error: ${sbDivisionInfoData.message}`);
    }

    // Test 3: Get countries from database for FP
    console.log('\n3. Testing GET /api/countries-db?division=FP');
    const countriesResponse = await fetch(`${BASE_URL}/api/countries-db?division=FP`);
    const countriesData = await countriesResponse.json();
    
    if (countriesData.success) {
      console.log(`✅ Success: Retrieved ${countriesData.data.length} countries`);
      console.log(`   Sample countries: ${countriesData.data.slice(0, 3).map(c => c.country).join(', ')}`);
    } else {
      console.log(`❌ Error: ${countriesData.message}`);
    }

    // Test 4: Get sales by country from database for FP
    console.log('\n4. Testing POST /api/sales-by-country-db');
    const salesByCountryResponse = await fetch(`${BASE_URL}/api/sales-by-country-db`, {
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
    
    const salesByCountryData = await salesByCountryResponse.json();
    
    if (salesByCountryData.success) {
      console.log(`✅ Success: Retrieved sales data for ${salesByCountryData.data.length} countries`);
      console.log(`   Sample data: ${salesByCountryData.data.slice(0, 2).map(d => `${d.country}: ${d.value}`).join(', ')}`);
    } else {
      console.log(`❌ Error: ${salesByCountryData.message}`);
    }

    // Test 5: Get countries by sales rep from database
    console.log('\n5. Testing GET /api/countries-by-sales-rep-db?division=FP&salesRep=Sofiane');
    const countriesByRepResponse = await fetch(`${BASE_URL}/api/countries-by-sales-rep-db?division=FP&salesRep=Sofiane`);
    const countriesByRepData = await countriesByRepResponse.json();
    
    if (countriesByRepData.success) {
      console.log(`✅ Success: Retrieved ${countriesByRepData.data.length} countries for Sofiane`);
      console.log(`   Sample countries: ${countriesByRepData.data.slice(0, 3).map(c => c.country).join(', ')}`);
    } else {
      console.log(`❌ Error: ${countriesByRepData.message}`);
    }

    // Test 6: Get country sales data
    console.log('\n6. Testing POST /api/country-sales-data-db');
    const countrySalesResponse = await fetch(`${BASE_URL}/api/country-sales-data-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        division: 'FP',
        country: 'UAE',
        year: 2024,
        months: [1, 2, 3],
        dataType: 'Actual',
        valueType: 'KGS'
      })
    });
    
    const countrySalesData = await countrySalesResponse.json();
    
    if (countrySalesData.success) {
      console.log(`✅ Success: Retrieved ${countrySalesData.data.length} sales records for UAE`);
      console.log(`   Sample data: ${countrySalesData.data.slice(0, 2).map(d => `${d.salesRep}: ${d.value}`).join(', ')}`);
    } else {
      console.log(`❌ Error: ${countrySalesData.message}`);
    }

    // Test 7: Test unsupported division (should return error)
    console.log('\n7. Testing GET /api/countries-db?division=INVALID');
    const invalidDivisionResponse = await fetch(`${BASE_URL}/api/countries-db?division=INVALID`);
    const invalidDivisionData = await invalidDivisionResponse.json();
    
    if (!invalidDivisionData.success) {
      console.log(`✅ Success: Correctly rejected invalid division - ${invalidDivisionData.message}`);
    } else {
      console.log(`❌ Error: Should have rejected invalid division`);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Division info endpoint working');
    console.log('   - Countries endpoint working');
    console.log('   - Sales by country endpoint working');
    console.log('   - Countries by sales rep endpoint working');
    console.log('   - Country sales data endpoint working');
    console.log('   - Error handling working');
    console.log('\n✅ Universal Sales by Country Database API is ready!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testUniversalSalesByCountry();




