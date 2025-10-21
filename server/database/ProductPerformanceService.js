const { pool } = require('./config');

/**
 * ProductPerformanceService
 * 
 * Service for querying product performance data from fp_data_excel table
 * Used by KPI Executive Summary dashboard for product-level metrics
 */
class ProductPerformanceService {
  constructor() {
    this.pool = pool;
  }

  // Month name to number mapping
  static monthMapping = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };

  /**
   * Convert month names to integers for database queries
   * Handles arrays of month names or numbers
   */
  convertMonthsToIntegers(months) {
    if (!Array.isArray(months)) {
      months = [months];
    }
    
    return months.map(month => {
      // If already a number, return it
      if (typeof month === 'number') {
        return month >= 1 && month <= 12 ? month : null;
      }
      
      // If string, try to convert
      if (typeof month === 'string') {
        const trimmed = month.trim();
        
        // Check if it's a numeric string
        if (/^\d+$/.test(trimmed)) {
          const num = parseInt(trimmed, 10);
          return num >= 1 && num <= 12 ? num : null;
        }
        
        // Look up month name
        return ProductPerformanceService.monthMapping[trimmed] || null;
      }
      
      return null;
    }).filter(m => m !== null);
  }

  /**
   * Get product performance data for a specific period
   * 
   * @param {Object} filters - Filter parameters
   * @param {number} filters.year - Year (e.g., 2025)
   * @param {string[]} filters.months - Array of month names (e.g., ['January', 'February'])
   * @param {string} filters.type - Data type ('Actual' or 'Budget')
   * @param {string[]} filters.excludedCategories - Categories to exclude (optional)
   * @returns {Promise<Array>} Array of product data with aggregated values
   */
  async getProductPerformanceData(filters) {
    try {
      const { year, months, type, excludedCategories = ['Raw Materials', 'N/A'] } = filters;

      // Convert month names to integers
      const monthIntegers = this.convertMonthsToIntegers(months);
      
      if (monthIntegers.length === 0) {
        throw new Error('No valid months provided. Please use month names (January, February) or numbers (1-12)');
      }

      const query = `
        SELECT 
          productgroup,
          material,
          process,
          values_type,
          SUM(values) as total_value
        FROM fp_data_excel
        WHERE year = $1
          AND month = ANY($2)
          AND UPPER(type) = UPPER($3)
          AND productgroup IS NOT NULL
          AND TRIM(productgroup) != ''
          AND LOWER(productgroup) NOT IN (${excludedCategories.map((_, i) => `LOWER($${i + 4})`).join(', ')})
        GROUP BY productgroup, material, process, values_type
        ORDER BY productgroup, values_type;
      `;

      const params = [year, monthIntegers, type, ...excludedCategories];
      
      
      const result = await this.pool.query(query, params);
      
      
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching product performance data:', error);
      throw error;
    }
  }

  /**
   * Get product performance data with comparison to previous period
   * 
   * @param {Object} currentPeriod - Current period filters
   * @param {Object} comparisonPeriod - Comparison period filters (optional)
   * @returns {Promise<Object>} Object with products array including current and previous values
   */
  async getProductPerformanceWithComparison(currentPeriod, comparisonPeriod = null) {
    try {
      // Fetch current period data
      const currentData = await this.getProductPerformanceData(currentPeriod);
      
      // Transform current data to product map
      const productMap = this.transformToProductMap(currentData);
      
      // Fetch comparison period data if provided
      if (comparisonPeriod) {
        const previousData = await this.getProductPerformanceData(comparisonPeriod);
        const previousMap = this.transformToProductMap(previousData);
        
        // Merge previous period data
        Object.keys(productMap).forEach(productName => {
          const product = productMap[productName];
          const prevProduct = previousMap[productName];
          
          if (prevProduct) {
            product.kgs_prev = prevProduct.kgs || 0;
            product.sales_prev = prevProduct.sales || 0;
            product.morm_prev = prevProduct.morm || 0;
            
            // Calculate growth percentages
            product.kgs_growth = this.calculateGrowth(product.kgs, product.kgs_prev);
            product.sales_growth = this.calculateGrowth(product.sales, product.sales_prev);
            product.morm_growth = this.calculateGrowth(product.morm, product.morm_prev);
          } else {
            product.kgs_prev = 0;
            product.sales_prev = 0;
            product.morm_prev = 0;
            product.kgs_growth = null;
            product.sales_growth = null;
            product.morm_growth = null;
          }
        });
      }
      
      // Convert map to sorted array (by sales descending)
      const products = Object.values(productMap)
        .sort((a, b) => (b.sales || 0) - (a.sales || 0));
      
      
      
      return products;
    } catch (error) {
      console.error('❌ Error fetching product performance with comparison:', error);
      throw error;
    }
  }

  /**
   * Get process category aggregations
   * 
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Process categories with aggregated metrics
   */
  async getProcessCategories(filters) {
    try {
      const { year, months, type, excludedCategories = ['Others', 'Raw Materials', 'N/A', 'Service Charges'] } = filters;

      // Convert month names to integers
      const monthIntegers = this.convertMonthsToIntegers(months);
      
      if (monthIntegers.length === 0) {
        throw new Error('No valid months provided');
      }

      const query = `
        SELECT 
          process,
          values_type,
          SUM(values) as total_value
        FROM fp_data_excel
        WHERE year = $1
          AND month = ANY($2)
          AND UPPER(type) = UPPER($3)
          AND process IS NOT NULL
          AND TRIM(process) != ''
          AND productgroup IS NOT NULL
          AND LOWER(productgroup) NOT IN (${excludedCategories.map((_, i) => `LOWER($${i + 4})`).join(', ')})
        GROUP BY process, values_type
        ORDER BY process, values_type;
      `;

      const params = [year, monthIntegers, type, ...excludedCategories];
      const result = await this.pool.query(query, params);
      
      // Transform to category map
      const categoryMap = {};
      result.rows.forEach(row => {
        if (!row.process) return;
        
        if (!categoryMap[row.process]) {
          categoryMap[row.process] = { kgs: 0, sales: 0, morm: 0 };
        }
        
        const category = categoryMap[row.process];
        const valueType = (row.values_type || '').toUpperCase();
        if (valueType === 'KGS') category.kgs = parseFloat(row.total_value || 0);
        if (valueType === 'AMOUNT') category.sales = parseFloat(row.total_value || 0);
        if (valueType === 'MORM') category.morm = parseFloat(row.total_value || 0);
      });
      
      
      return categoryMap;
    } catch (error) {
      console.error('❌ Error fetching process categories:', error);
      throw error;
    }
  }

  /**
   * Get material category aggregations
   * 
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Material categories with aggregated metrics
   */
  async getMaterialCategories(filters) {
    try {
      const { year, months, type, excludedCategories = ['Others', 'Raw Materials', 'N/A', 'Service Charges'] } = filters;

      // Convert month names to integers
      const monthIntegers = this.convertMonthsToIntegers(months);
      
      if (monthIntegers.length === 0) {
        throw new Error('No valid months provided');
      }

      const query = `
        SELECT 
          material,
          values_type,
          SUM(values) as total_value
        FROM fp_data_excel
        WHERE year = $1
          AND month = ANY($2)
          AND UPPER(type) = UPPER($3)
          AND material IS NOT NULL
          AND TRIM(material) != ''
          AND productgroup IS NOT NULL
          AND LOWER(productgroup) NOT IN (${excludedCategories.map((_, i) => `LOWER($${i + 4})`).join(', ')})
        GROUP BY material, values_type
        ORDER BY material, values_type;
      `;

      const params = [year, monthIntegers, type, ...excludedCategories];
      const result = await this.pool.query(query, params);
      
      // Transform to category map
      const categoryMap = {};
      result.rows.forEach(row => {
        if (!row.material) return;
        
        if (!categoryMap[row.material]) {
          categoryMap[row.material] = { kgs: 0, sales: 0, morm: 0 };
        }
        
        const category = categoryMap[row.material];
        const valueType = (row.values_type || '').toUpperCase();
        if (valueType === 'KGS') category.kgs = parseFloat(row.total_value || 0);
        if (valueType === 'AMOUNT') category.sales = parseFloat(row.total_value || 0);
        if (valueType === 'MORM') category.morm = parseFloat(row.total_value || 0);
      });
      
      
      return categoryMap;
    } catch (error) {
      console.error('❌ Error fetching material categories:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive product performance including products, process categories, and material categories
   * 
   * @param {Object} currentPeriod - Current period filters
   * @param {Object} comparisonPeriod - Comparison period filters (optional)
   * @returns {Promise<Object>} Complete product performance data
   */
  async getComprehensiveProductPerformance(currentPeriod, comparisonPeriod = null) {
    try {
      
      // Fetch all data in parallel for better performance
      const [products, processCategories, materialCategories] = await Promise.all([
        this.getProductPerformanceWithComparison(currentPeriod, comparisonPeriod),
        this.getProcessCategories(currentPeriod),
        this.getMaterialCategories(currentPeriod)
      ]);
      
      const result = {
        products,
        processCategories,
        materialCategories,
        summary: {
          totalProducts: products.length,
          totalKgs: products.reduce((sum, p) => sum + (p.kgs || 0), 0),
          totalSales: products.reduce((sum, p) => sum + (p.sales || 0), 0),
          totalMorm: products.reduce((sum, p) => sum + (p.morm || 0), 0),
          processCount: Object.keys(processCategories).length,
          materialCount: Object.keys(materialCategories).length
        }
      };
      
      
      return result;
    } catch (error) {
      console.error('❌ Error fetching comprehensive product performance:', error);
      throw error;
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Transform database rows to product map
   * Groups by product name and organizes KGS, Amount, MoRM
   */
  transformToProductMap(rows) {
    const productMap = {};
    
    
    rows.forEach((row, index) => {
      if (!row.productgroup) return;
      
      if (!productMap[row.productgroup]) {
        productMap[row.productgroup] = {
          name: row.productgroup,
          material: row.material || '',
          process: row.process || '',
          kgs: 0,
          sales: 0,
          morm: 0
        };
      }
      
      const product = productMap[row.productgroup];
      
      // Update material/process if not set (take first non-null value)
      if (!product.material && row.material) product.material = row.material;
      if (!product.process && row.process) product.process = row.process;
      
      // Aggregate values by type (case-insensitive)
      const value = parseFloat(row.total_value || 0);
      const valueType = (row.values_type || '').toUpperCase();
      
      
      if (valueType === 'KGS') {
        product.kgs += value;
      } else if (valueType === 'AMOUNT') {
        product.sales += value;
      } else if (valueType === 'MORM') {
        product.morm += value;
      }
      
    });
    
    
    return productMap;
  }

  /**
   * Calculate growth percentage between current and previous values
   */
  calculateGrowth(current, previous) {
    if (!previous || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  /**
   * Format period object to readable string
   */
  formatPeriod(period) {
    if (!period) return 'N/A';
    const monthsStr = period.months && period.months.length > 0 ? period.months.join(', ') : 'All';
    return `${period.year} ${monthsStr} (${period.type})`;
  }
}

module.exports = new ProductPerformanceService();

