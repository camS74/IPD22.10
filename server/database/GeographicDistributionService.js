const { Pool } = require('pg');
const { fpPool } = require('./fp_database_config');
const WorldCountriesService = require('./WorldCountriesService');

class GeographicDistributionService {
  constructor() {
    this.pool = fpPool;
  }

  /**
   * Get geographic distribution data for a specific period with comparison
   * @param {Object} filters - Filter parameters
   * @param {string} filters.division - Division (FP, SB, TF, HCM)
   * @param {number} filters.year - Year (e.g., 2025)
   * @param {string[]} filters.months - Array of month names (e.g., ['January', 'February'])
   * @param {string} filters.type - Data type ('Actual' or 'Budget')
   * @param {boolean} filters.includeComparison - Whether to include previous period data
   * @returns {Promise<Object>} Object with country sales and regional data
   */
  async getGeographicDistributionData(filters) {
    try {
      const { division = 'FP', year, months, type = 'Actual', includeComparison = false } = filters;

      // Convert month names to integers
      const monthIntegers = this.convertMonthsToIntegers(months);
      
      if (monthIntegers.length === 0) {
        throw new Error('No valid months provided. Please use month names (January, February) or numbers (1-12)');
      }

      // For now, only FP division is supported
      if (division !== 'FP') {
        throw new Error(`Division ${division} not yet supported. Only FP division is available.`);
      }

      const query = `
        SELECT 
          countryname,
          SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_sales
        FROM fp_data_excel
        WHERE year = $1
          AND month = ANY($2)
          AND UPPER(type) = UPPER($3)
          AND countryname IS NOT NULL
          AND TRIM(countryname) != ''
          AND TRIM(UPPER(values_type)) = 'AMOUNT'
        GROUP BY countryname
        HAVING SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) > 0
        ORDER BY total_sales DESC
      `;

      const params = [year, monthIntegers, type];
      
      console.log('🔍 Fetching geographic distribution data:', { 
        division, year, months, monthIntegers, type 
      });
      
      const result = await this.pool.query(query, params);
      
      console.log(`✅ Retrieved ${result.rows.length} countries for geographic distribution`);
      
      // Log sample data for debugging
      if (result.rows.length > 0) {
        console.log('📊 Sample country data:', result.rows.slice(0, 3).map(row => ({
          country: row.countryname,
          sales: row.total_sales
        })));
      } else {
        console.warn('⚠️ No country data found for the given parameters');
      }
      
      // Process the data
      const countrySales = result.rows.map(row => ({
        name: row.countryname,
        value: parseFloat(row.total_sales) || 0
      }));

      // Calculate regional distribution
      const regionalSales = this.calculateRegionalSales(countrySales);
      
      // Calculate local vs export
      const totalSales = countrySales.reduce((sum, country) => sum + country.value, 0);
      const localSales = regionalSales['UAE'] || 0;
      const exportSales = totalSales - localSales;
      
      const localPercentage = totalSales > 0 ? (localSales / totalSales * 100) : 0;
      const exportPercentage = 100 - localPercentage;

      const currentData = {
        countrySales,
        regionalSales,
        totalSales,
        localSales,
        exportSales,
        localPercentage,
        exportPercentage,
        regionalPercentages: this.calculateRegionalPercentages(regionalSales, totalSales)
      };

      // If comparison is requested, fetch previous period data
      if (includeComparison) {
        const previousYear = parseInt(year) - 1;
        const previousResult = await this.pool.query(query, [previousYear, monthIntegers, type]);
        
        const previousCountrySales = previousResult.rows.map(row => ({
          name: row.countryname,
          value: parseFloat(row.total_sales) || 0
        }));

        const previousRegionalSales = this.calculateRegionalSales(previousCountrySales);
        const previousTotalSales = previousCountrySales.reduce((sum, country) => sum + country.value, 0);
        
        // Calculate growth percentages for each region
        const regionalGrowth = {};
        Object.keys(regionalSales).forEach(region => {
          const currentValue = regionalSales[region] || 0;
          const previousValue = previousRegionalSales[region] || 0;
          
          if (previousValue > 0) {
            regionalGrowth[region] = ((currentValue - previousValue) / previousValue * 100);
          } else if (currentValue > 0) {
            regionalGrowth[region] = 100; // New region with sales
          } else {
            regionalGrowth[region] = 0;
          }
        });

        currentData.regionalGrowth = regionalGrowth;
        currentData.previousPeriod = {
          year: previousYear,
          regionalSales: previousRegionalSales,
          totalSales: previousTotalSales
        };
      }

      return currentData;
      
    } catch (error) {
      console.error('❌ Error fetching geographic distribution data:', error);
      throw error;
    }
  }

  /**
   * Convert month names to integers
   */
  convertMonthsToIntegers(months) {
    const monthMapping = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12,
      'Q1': [1, 2, 3], 'Q2': [4, 5, 6], 'Q3': [7, 8, 9], 'Q4': [10, 11, 12],
      'HY1': [1, 2, 3, 4, 5, 6], 'HY2': [7, 8, 9, 10, 11, 12]
    };

    const result = [];
    months.forEach(month => {
      // Handle month names
      if (monthMapping[month]) {
        if (Array.isArray(monthMapping[month])) {
          result.push(...monthMapping[month]);
        } else {
          result.push(monthMapping[month]);
        }
      } 
      // Handle integers (already converted by frontend)
      else if (typeof month === 'number' && month >= 1 && month <= 12) {
        result.push(month);
      }
      // Handle string numbers
      else if (typeof month === 'string' && !isNaN(month) && parseInt(month) >= 1 && parseInt(month) <= 12) {
        result.push(parseInt(month));
      }
      else {
        console.warn(`⚠️ Invalid month value: ${month} (type: ${typeof month})`);
      }
    });

    const uniqueResult = [...new Set(result)]; // Remove duplicates
    console.log(`🔍 Converted months: ${JSON.stringify(months)} → ${JSON.stringify(uniqueResult)}`);
    return uniqueResult;
  }

  /**
   * Calculate regional sales from country data
   */
  calculateRegionalSales(countrySales) {
    const regionalSales = {
      'UAE': 0,
      'Arabian Peninsula': 0,
      'West Asia': 0,
      'Levant': 0,
      'North Africa': 0,
      'Southern Africa': 0,
      'Europe': 0,
      'Americas': 0,
      'Asia-Pacific': 0,
      'Unassigned': 0
    };

    countrySales.forEach(country => {
      const region = this.getRegionForCountry(country.name);
      if (region && regionalSales[region] !== undefined) {
        regionalSales[region] += country.value;
      } else {
        regionalSales['Unassigned'] += country.value;
      }
    });

    return regionalSales;
  }

  /**
   * Calculate regional percentages
   */
  calculateRegionalPercentages(regionalSales, totalSales) {
    const regionalPercentages = {};
    Object.keys(regionalSales).forEach(region => {
      regionalPercentages[region] = totalSales > 0 ? (regionalSales[region] / totalSales * 100) : 0;
    });
    return regionalPercentages;
  }

  /**
   * Enhanced getRegionForCountry with comprehensive world countries database
   */
  getRegionForCountry(countryName) {
    if (!countryName) return 'Unassigned';
    
    // Use WorldCountriesService for smart assignment
    const worldCountriesService = new WorldCountriesService();
    const assignment = worldCountriesService.smartCountryAssignment(countryName);
    
    return assignment.region;
  }
}

module.exports = GeographicDistributionService;
