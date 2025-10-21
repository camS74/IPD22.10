const { Pool } = require('pg');
const { fpPool } = require('./database/fp_database_config');

// Import the same logic from GeographicDistributionService
function getRegionForCountry(countryName) {
  if (!countryName) return 'Unassigned';
  
  const country = countryName.toString().trim().toLowerCase();
  
  // UAE
  if (country.includes('uae') || country.includes('emirates') || country.includes('united arab')) {
    return 'UAE';
  }
  
  // Arabian Peninsula (GCC countries)
  if (country.includes('saudi') || country.includes('ksa') || country.includes('kingdom of saudi') ||
      country.includes('kuwait') || country.includes('qatar') || country.includes('bahrain') || 
      country.includes('oman') || country.includes('yemen')) {
    return 'Arabian Peninsula';
  }
  
  // West Asia
  if (country.includes('iran') || country.includes('iraq') || country.includes('turkey') || 
      country.includes('afghanistan') || country.includes('pakistan')) {
    return 'West Asia';
  }
  
  // Levant
  if (country.includes('jordan') || country.includes('lebanon') || country.includes('syria') || 
      country.includes('palestine') || country.includes('israel')) {
    return 'Levant';
  }
  
  // North Africa
  if (country.includes('egypt') || country.includes('libya') || country.includes('tunisia') || 
      country.includes('algeria') || country.includes('morocco') || country.includes('sudan')) {
    return 'North Africa';
  }
  
  // Southern Africa
  if (country.includes('south africa') || country.includes('kenya') || country.includes('tanzania') || 
      country.includes('uganda') || country.includes('ghana') || country.includes('nigeria')) {
    return 'Southern Africa';
  }
  
  // Europe
  if (country.includes('germany') || country.includes('france') || country.includes('italy') || 
      country.includes('spain') || country.includes('netherlands') || country.includes('belgium') || 
      country.includes('switzerland') || country.includes('austria') || country.includes('poland') || 
      country.includes('czech') || country.includes('united kingdom') || country.includes('uk')) {
    return 'Europe';
  }
  
  // Americas
  if (country.includes('united states') || country.includes('usa') || country.includes('america') || 
      country.includes('canada') || country.includes('mexico') || country.includes('brazil') || 
      country.includes('argentina')) {
    return 'Americas';
  }
  
  // Asia-Pacific
  if (country.includes('india') || country.includes('china') || country.includes('japan') || 
      country.includes('south korea') || country.includes('singapore') || country.includes('malaysia') || 
      country.includes('thailand') || country.includes('indonesia') || country.includes('philippines') || 
      country.includes('australia') || country.includes('new zealand')) {
    return 'Asia-Pacific';
  }
  
  return 'Unassigned';
}

async function checkUnassignedCountries() {
  const pool = fpPool;
  
  try {
    console.log('🔍 Checking countries that are categorized as "Unassigned"...\n');
    
    // Get all countries with sales data for HY1 2025
    const query = `
      SELECT 
        countryname,
        SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_sales
      FROM fp_data_excel
      WHERE year = 2025
        AND month IN (1, 2, 3, 4, 5, 6)
        AND UPPER(type) = 'ACTUAL'
        AND countryname IS NOT NULL
        AND TRIM(countryname) != ''
        AND TRIM(UPPER(values_type)) = 'AMOUNT'
      GROUP BY countryname
      HAVING SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) > 0
      ORDER BY total_sales DESC
    `;
    
    const result = await pool.query(query);
    
    console.log(`📊 Found ${result.rows.length} countries with sales data for HY1 2025\n`);
    
    // Categorize countries
    const categorizedCountries = {};
    const unassignedCountries = [];
    
    result.rows.forEach(row => {
      const countryName = row.countryname;
      const sales = parseFloat(row.total_sales);
      const region = getRegionForCountry(countryName);
      
      if (!categorizedCountries[region]) {
        categorizedCountries[region] = [];
      }
      
      categorizedCountries[region].push({
        name: countryName,
        sales: sales
      });
      
      if (region === 'Unassigned') {
        unassignedCountries.push({
          name: countryName,
          sales: sales
        });
      }
    });
    
    // Display unassigned countries
    if (unassignedCountries.length > 0) {
      console.log('❓ UNASSIGNED COUNTRIES:');
      console.log('========================');
      
      const totalUnassignedSales = unassignedCountries.reduce((sum, country) => sum + country.sales, 0);
      
      unassignedCountries.forEach((country, index) => {
        const percentage = (country.sales / totalUnassignedSales * 100).toFixed(1);
        console.log(`${index + 1}. ${country.name}: ${country.sales.toLocaleString()} (${percentage}% of unassigned)`);
      });
      
      console.log(`\n📊 Total Unassigned Sales: ${totalUnassignedSales.toLocaleString()}`);
      
      // Show all regions summary
      console.log('\n🌍 ALL REGIONS SUMMARY:');
      console.log('========================');
      Object.entries(categorizedCountries).forEach(([region, countries]) => {
        const regionTotal = countries.reduce((sum, country) => sum + country.sales, 0);
        console.log(`${region}: ${countries.length} countries, ${regionTotal.toLocaleString()} total sales`);
      });
      
    } else {
      console.log('✅ No unassigned countries found! All countries are properly categorized.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUnassignedCountries();
