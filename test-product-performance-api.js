/**
 * Test script for Product Performance API
 * 
 * This script tests the new /api/fp/product-performance endpoint
 * Run with: node test-product-performance-api.js
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api/fp/product-performance';

// Test cases
const testCases = [
  {
    name: 'Test 1: Single month (January 2025 Actual)',
    payload: {
      currentPeriod: {
        year: 2025,
        months: ['January'],
        type: 'Actual'
      }
    }
  },
  {
    name: 'Test 2: Quarter (Q1 2025 Actual)',
    payload: {
      currentPeriod: {
        year: 2025,
        months: ['January', 'February', 'March'],
        type: 'Actual'
      }
    }
  },
  {
    name: 'Test 3: Half-year with comparison (H1 2025 vs H1 2024)',
    payload: {
      currentPeriod: {
        year: 2025,
        months: ['January', 'February', 'March', 'April', 'May', 'June'],
        type: 'Actual'
      },
      comparisonPeriod: {
        year: 2024,
        months: ['January', 'February', 'March', 'April', 'May', 'June'],
        type: 'Actual'
      }
    }
  },
  {
    name: 'Test 4: Budget data (January 2025 Budget)',
    payload: {
      currentPeriod: {
        year: 2025,
        months: ['January'],
        type: 'Budget'
      }
    }
  }
];

// Helper function to format numbers
function formatNumber(num, decimals = 2) {
  if (num == null) return 'N/A';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Run a single test
async function runTest(testCase) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ${testCase.name}`);
  console.log('='.repeat(80));
  
  try {
    console.log('📤 Request payload:', JSON.stringify(testCase.payload, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.payload)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', result.message || result.error);
      return;
    }
    
    if (!result.success) {
      console.error('❌ Request failed:', result.message);
      return;
    }
    
    const { data, meta } = result;
    
    console.log('\n✅ SUCCESS!');
    console.log('\n📋 Metadata:');
    console.log(`   Current Period: ${meta.currentPeriod}`);
    if (meta.comparisonPeriod) {
      console.log(`   Comparison Period: ${meta.comparisonPeriod}`);
    }
    console.log(`   Timestamp: ${meta.timestamp}`);
    
    console.log('\n📊 Summary:');
    console.log(`   Total Products: ${data.summary.totalProducts}`);
    console.log(`   Total KGS: ${formatNumber(data.summary.totalKgs, 0)} kg`);
    console.log(`   Total Sales: AED ${formatNumber(data.summary.totalSales, 0)}`);
    console.log(`   Total MoRM: AED ${formatNumber(data.summary.totalMorm, 0)}`);
    console.log(`   Process Categories: ${data.summary.processCount}`);
    console.log(`   Material Categories: ${data.summary.materialCount}`);
    
    console.log('\n🏆 Top 5 Products by Sales:');
    data.products.slice(0, 5).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name}`);
      console.log(`      - Material: ${product.material || 'N/A'}, Process: ${product.process || 'N/A'}`);
      console.log(`      - Sales: AED ${formatNumber(product.sales, 0)}`);
      console.log(`      - KGS: ${formatNumber(product.kgs, 0)} kg`);
      console.log(`      - MoRM: AED ${formatNumber(product.morm, 0)}`);
      if (product.sales_prev) {
        const growth = ((product.sales - product.sales_prev) / product.sales_prev * 100).toFixed(1);
        console.log(`      - Growth: ${growth > 0 ? '+' : ''}${growth}%`);
      }
    });
    
    console.log('\n⚙️ Process Categories:');
    Object.entries(data.processCategories).forEach(([process, metrics]) => {
      console.log(`   ${process}:`);
      console.log(`      - Sales: AED ${formatNumber(metrics.sales, 0)}`);
      console.log(`      - KGS: ${formatNumber(metrics.kgs, 0)} kg`);
      console.log(`      - MoRM: AED ${formatNumber(metrics.morm, 0)}`);
    });
    
    console.log('\n🧪 Material Categories:');
    Object.entries(data.materialCategories).forEach(([material, metrics]) => {
      console.log(`   ${material}:`);
      console.log(`      - Sales: AED ${formatNumber(metrics.sales, 0)}`);
      console.log(`      - KGS: ${formatNumber(metrics.kgs, 0)} kg`);
      console.log(`      - MoRM: AED ${formatNumber(metrics.morm, 0)}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n🚀 Starting Product Performance API Tests...');
  console.log('   API URL:', API_URL);
  console.log('   Make sure backend server is running on http://localhost:3001\n');
  
  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3001/');
    if (!healthCheck.ok) {
      console.error('❌ Backend server is not responding properly');
      return;
    }
    console.log('✅ Backend server is running\n');
  } catch (error) {
    console.error('❌ Cannot connect to backend server. Please start it first.');
    console.error('   Run: npm start (in server directory)\n');
    return;
  }
  
  // Run each test case
  for (const testCase of testCases) {
    await runTest(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ All tests completed!');
  console.log('='.repeat(80) + '\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


