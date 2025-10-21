// Use shared fp_database pool with env-configured credentials
const { fpPool } = require('./fp_database_config');

class ProductGroupDataService {
  
  // Month mapping for period handling
  static monthMapping = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };

  // Quarter and half-year mappings
  static quarterMonths = {
    'Q1': [1, 2, 3],
    'Q2': [4, 5, 6],
    'Q3': [7, 8, 9],
    'Q4': [10, 11, 12]
  };

  static halfYearMonths = {
    'HY1': [1, 2, 3, 4, 5, 6],
    'HY2': [7, 8, 9, 10, 11, 12]
  };

  static fullYearMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  /**
   * Get months array based on period selection
   */
  static getMonthsArray(period) {
    if (period === 'FY' || period === 'Year') {
      return this.fullYearMonths;
    }
    if (this.quarterMonths[period]) {
      return this.quarterMonths[period];
    }
    if (this.halfYearMonths[period]) {
      return this.halfYearMonths[period];
    }
    if (this.monthMapping[period]) {
      return [this.monthMapping[period]];
    }
    if (Array.isArray(period)) {
      // Accept arrays of month names, numeric strings, or numbers
      const normalized = period.map(m => {
        if (typeof m === 'number') { return m; }
        if (typeof m === 'string') {
          const trimmed = m.trim();
          if (/^\d+$/.test(trimmed)) {
            const num = parseInt(trimmed, 10);
            return num >= 1 && num <= 12 ? num : null;
          }
          return this.monthMapping[trimmed] || null;
        }
        return null;
      }).filter(n => typeof n === 'number' && n >= 1 && n <= 12);
      return normalized;
    }
    return [];
  }

  /**
   * Get product groups data aggregated by product group
   */
  static async getProductGroupsData(year, months, type) {
    try {
      const monthsArray = this.getMonthsArray(months);
      if (monthsArray.length === 0) {
        throw new Error('Invalid months specification');
      }

      const monthsPlaceholder = monthsArray.map((_, index) => `$${index + 3}`).join(',');
      
      const query = `
        SELECT 
          productgroup,
          SUM(CASE WHEN values_type = 'KGS' THEN values ELSE 0 END) as kgs,
          SUM(CASE WHEN values_type = 'AMOUNT' THEN values ELSE 0 END) as sales,
          SUM(CASE WHEN values_type = 'MORM' THEN values ELSE 0 END) as morm
        FROM fp_data_excel 
        WHERE year = $1 
          AND month IN (${monthsPlaceholder})
          AND UPPER(type) = UPPER($2)
        GROUP BY productgroup
        ORDER BY productgroup
      `;

      const params = [year, type, ...monthsArray];
      const client = await fpPool.connect();
      
      try {
        const result = await client.query(query, params);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting product groups data:', error);
      throw error;
    }
  }

  /**
   * Get material categories data
   */
  static async getMaterialCategoriesData(year, months, type) {
    try {
      const monthsArray = this.getMonthsArray(months);
      if (monthsArray.length === 0) {
        throw new Error('Invalid months specification');
      }

      const monthsPlaceholder = monthsArray.map((_, index) => `$${index + 3}`).join(',');
      
      const query = `
        SELECT 
          material,
          SUM(CASE WHEN values_type = 'KGS' THEN values ELSE 0 END) as kgs,
          SUM(CASE WHEN values_type = 'AMOUNT' THEN values ELSE 0 END) as sales,
          SUM(CASE WHEN values_type = 'MORM' THEN values ELSE 0 END) as morm
        FROM fp_data_excel 
        WHERE year = $1 
          AND month IN (${monthsPlaceholder})
          AND UPPER(type) = UPPER($2)
        GROUP BY material
        ORDER BY material
      `;

      const params = [year, type, ...monthsArray];
      const client = await fpPool.connect();
      
      try {
        const result = await client.query(query, params);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting material categories data:', error);
      throw error;
    }
  }

  /**
   * Get process categories data
   */
  static async getProcessCategoriesData(year, months, type) {
    try {
      const monthsArray = this.getMonthsArray(months);
      if (monthsArray.length === 0) {
        throw new Error('Invalid months specification');
      }

      const monthsPlaceholder = monthsArray.map((_, index) => `$${index + 3}`).join(',');
      
      const query = `
        SELECT 
          process,
          SUM(CASE WHEN values_type = 'KGS' THEN values ELSE 0 END) as kgs,
          SUM(CASE WHEN values_type = 'AMOUNT' THEN values ELSE 0 END) as sales,
          SUM(CASE WHEN values_type = 'MORM' THEN values ELSE 0 END) as morm
        FROM fp_data_excel 
        WHERE year = $1 
          AND month IN (${monthsPlaceholder})
          AND UPPER(type) = UPPER($2)
        GROUP BY process
        ORDER BY process
      `;

      const params = [year, type, ...monthsArray];
      const client = await fpPool.connect();
      
      try {
        const result = await client.query(query, params);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting process categories data:', error);
      throw error;
    }
  }

  /**
   * Get all unique product groups
   */
  static async getAllProductGroups() {
    try {
      const query = `
        SELECT DISTINCT productgroup 
        FROM fp_data_excel 
        ORDER BY productgroup
      `;
      
      const client = await fpPool.connect();
      
      try {
        const result = await client.query(query);
        return result.rows.map(row => row.productgroup);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting all product groups:', error);
      throw error;
    }
  }

  /**
   * Get all unique materials
   */
  static async getAllMaterials() {
    try {
      const query = `
        SELECT DISTINCT material 
        FROM fp_data_excel 
        WHERE material IS NOT NULL AND material != ''
        ORDER BY material
      `;
      
      const client = await fpPool.connect();
      
      try {
        const result = await client.query(query);
        return result.rows.map(row => row.material);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting all materials:', error);
      throw error;
    }
  }

  /**
   * Get all unique processes
   */
  static async getAllProcesses() {
    try {
      const query = `
        SELECT DISTINCT process 
        FROM fp_data_excel 
        WHERE process IS NOT NULL AND process != ''
        ORDER BY process
      `;
      
      const client = await fpPool.connect();
      
      try {
        const result = await client.query(query);
        return result.rows.map(row => row.process);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting all processes:', error);
      throw error;
    }
  }

  /**
   * Validate data completeness for a product group
   */
  static async validateProductGroupData(productGroup, year, months, type) {
    try {
      const monthsArray = this.getMonthsArray(months);
      if (monthsArray.length === 0) {
        return false;
      }

      const monthsPlaceholder = monthsArray.map((_, index) => `$${index + 4}`).join(',');
      
      const query = `
        SELECT 
          COUNT(DISTINCT values_type) as types_count,
          SUM(CASE WHEN values_type = 'KGS' THEN values ELSE 0 END) as kgs,
          SUM(CASE WHEN values_type = 'AMOUNT' THEN values ELSE 0 END) as sales,
          SUM(CASE WHEN values_type = 'MORM' THEN values ELSE 0 END) as morm
        FROM fp_data_excel 
        WHERE productgroup = $1
          AND year = $2 
          AND month IN (${monthsPlaceholder})
          AND UPPER(type) = UPPER($3)
      `;

      const params = [productGroup, year, type, ...monthsArray];
      const client = await fpPool.connect();
      
      try {
        const result = await client.query(query, params);
        const row = result.rows[0];
        
        // Check if we have all three value types and at least some non-zero values
        return row.types_count >= 3 && (row.kgs > 0 || row.sales > 0 || row.morm > 0);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error validating product group data:', error);
      return false;
    }
  }
}

module.exports = ProductGroupDataService;







