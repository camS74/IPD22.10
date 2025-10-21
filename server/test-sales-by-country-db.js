// Test script for new Sales by Country Database API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testSalesByCountryDB() {
  console.log('🧪 Testing Sales by Country Database API Endpoints...\n');

  try {
    // Test 1: Get countries from database
    console.log('1. Testing GET /api/countries-db?division=FP');
    const countriesResponse = await fetch(`${BASE_URL}/api/countries-db?division=FP`);
    const countriesData = await countriesResponse.json();
    
    if (countriesData.success) {
      console.log(`✅ Success: Retrieved ${countriesData.data.length} countries`);
      console.log(`   Sample countries: ${countriesData.data.slice(0, 3).map(c => c.country).join(', ')}`);
    } else {
      console.log(`❌ Error: ${countriesData.message}`);
    }

    // Test 2: Get sales by country from database
    console.log('\n2. Testing POST /api/sales-by-country-db');
    const salesResponse = await fetch(`${BASE_URL}/api/sales-by-country-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        division: 'FP',
        salesRep: 'Sofiane', // Replace with actual sales rep name
        year: 2025,
        months: ['January', 'February', 'March'],
        dataType: 'Actual'
      })
    });
    const salesData = await salesResponse.json();
    
    if (salesData.success) {
      console.log(`✅ Success: Retrieved sales data for ${salesData.data.length} countries`);
      console.log(`   Sample data: ${salesData.data.slice(0, 2).map(d => `${d.country}: ${d.value}`).join(', ')}`);
    } else {
      console.log(`❌ Error: ${salesData.message}`);
    }

    // Test 3: Get countries by sales rep from database
    console.log('\n3. Testing GET /api/countries-by-sales-rep-db?division=FP&salesRep=Sofiane');
    const countriesByRepResponse = await fetch(`${BASE_URL}/api/countries-by-sales-rep-db?division=FP&salesRep=Sofiane`);
    const countriesByRepData = await countriesByRepResponse.json();
    
    if (countriesByRepData.success) {
      console.log(`✅ Success: Retrieved ${countriesByRepData.data.length} countries for sales rep`);
      console.log(`   Sample countries: ${countriesByRepData.data.slice(0, 3).map(c => c.country).join(', ')}`);
    } else {
      console.log(`❌ Error: ${countriesByRepData.message}`);
    }

    // Test 4: Get country sales data for specific period
    console.log('\n4. Testing POST /api/country-sales-data-db');
    const countryDataResponse = await fetch(`${BASE_URL}/api/country-sales-data-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        division: 'FP',
        country: 'United Arab Emirates', // Replace with actual country name
        year: 2025,
        months: ['January'],
        dataType: 'Actual',
        valueType: 'KGS'
      })
    });
    const countryData = await countryDataResponse.json();
    
    if (countryData.success) {
      console.log(`✅ Success: Retrieved sales data: ${countryData.data}`);
    } else {
      console.log(`❌ Error: ${countryData.message}`);
    }

    // Test 5: Test unsupported division
    console.log('\n5. Testing unsupported division (SB)');
    const unsupportedResponse = await fetch(`${BASE_URL}/api/countries-db?division=SB`);
    const unsupportedData = await unsupportedResponse.json();
    
    if (!unsupportedData.success) {
      console.log(`✅ Success: Correctly rejected unsupported division: ${unsupportedData.message}`);
    } else {
      console.log(`❌ Error: Should have rejected unsupported division`);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSalesByCountryDB();
}

module.exports = { testSalesByCountryDB };




