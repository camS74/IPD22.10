const { pool } = require('./config');

class UniversalSalesByCountryService {
  
  // Utility function to convert names to proper case
  static toProperCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
  
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
   * ULTRA-FAST method: Get ALL sales rep divisional data in a single optimized SQL query
   * This replaces hundreds of individual queries with ONE super-efficient query
   */
  static async getSalesRepDivisionalUltraFast(division, salesReps, columns) {
    try {
      const tableName = this.getTableName(division);
      
      // Initialize result structure
      const ultraFastData = {};
      salesReps.forEach(salesRep => {
        const upperSalesRep = String(salesRep).trim().toUpperCase();
        ultraFastData[upperSalesRep] = {};
        columns.forEach(column => {
          ultraFastData[upperSalesRep][column.columnKey] = 0;
        });
      });
      
      // Query each column period separately (like the working getSalesByCustomer pattern)
      for (const column of columns) {
        const monthsArray = this.getMonthsForColumn(column);
        const year = parseInt(column.year);
        const dataType = column.type || 'Actual';
        
        // Build query using the EXACT pattern from getSalesByCustomer
        const placeholders = salesReps.map((_, index) => `$${index + 1}`).join(', ');
        const monthPlaceholders = monthsArray.map((_, idx) => `$${salesReps.length + 2 + idx}`).join(', ');
        
        const query = `
          SELECT 
            TRIM(UPPER(salesrepname)) as salesrepname,
            SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_value 
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) IN (${placeholders}) 
          AND year = $${salesReps.length + 1}
          AND month IN (${monthPlaceholders})
          AND UPPER(type) = UPPER($${salesReps.length + 2 + monthsArray.length})
          GROUP BY TRIM(UPPER(salesrepname))
        `;
        
        const params = [
          ...salesReps.map(rep => String(rep).trim().toUpperCase()),
          year,
          ...monthsArray,
          dataType
        ];
        
        console.log(`🚀 Querying ${column.columnKey}: year=${year}, months=${monthsArray}, type=${dataType}`);
        
        const result = await pool.query(query, params);
        
        console.log(`⚡ Got ${result.rows.length} sales reps with data for ${column.columnKey}`);
        
        // Store results
        result.rows.forEach(row => {
          const salesRep = row.salesrepname;
          const value = parseFloat(row.total_value) || 0;
          if (ultraFastData[salesRep]) {
            ultraFastData[salesRep][column.columnKey] = value;
          }
        });
      }
      
      console.log(`⚡ ULTRA-FAST Processed data for ${Object.keys(ultraFastData).length} sales reps across ${columns.length} columns`);
      return ultraFastData;
      
    } catch (error) {
      console.error('❌ Error in ULTRA-FAST sales rep divisional query:', error);
      throw error;
    }
  }

  /**
   * ULTRA-FAST method: Get ALL sales by customer data with optimized queries
   * Returns data grouped by column key with customer -> value mapping
   */
  static async getSalesByCustomerUltraFast(division, columns) {
    try {
      const tableName = this.getTableName(division);
      
      // Result structure: { columnKey: [{ customer: 'name', value: 123 }, ...] }
      const ultraFastData = {};
      
      // Query each column period separately (same pattern as sales rep)
      for (const column of columns) {
        const monthsArray = this.getMonthsForColumn(column);
        const year = parseInt(column.year);
        const dataType = column.type || 'Actual';
        const columnKey = column.columnKey || `${column.year}-${column.month}-${column.type}`;
        
        // Query to get all customers and their sales for this period
        const query = `
          SELECT 
            customername,
            SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_value 
          FROM ${tableName}
          WHERE year = $1
          AND month IN (${monthsArray.map((_, idx) => `$${2 + idx}`).join(', ')})
          AND UPPER(type) = UPPER($${2 + monthsArray.length})
          AND customername IS NOT NULL
          AND TRIM(customername) != ''
          GROUP BY customername
          ORDER BY total_value DESC
        `;
        
        const params = [year, ...monthsArray, dataType];
        
        console.log(`🚀 Querying Sales by Customer for ${columnKey}: year=${year}, months=${monthsArray}, type=${dataType}`);
        
        const result = await pool.query(query, params);
        
        console.log(`⚡ Got ${result.rows.length} customers with data for ${columnKey}`);
        
        // Store results in the same format as the original API
        ultraFastData[columnKey] = result.rows.map(row => ({
          customer: row.customername,
          value: parseFloat(row.total_value) || 0
        }));
      }
      
      console.log(`⚡ ULTRA-FAST Processed sales by customer data across ${columns.length} columns`);
      return ultraFastData;
      
    } catch (error) {
      console.error('❌ Error in ULTRA-FAST sales by customer query:', error);
      throw error;
    }
  }

  /**
   * ULTRA-FAST method: Get ALL sales rep reports data at once
   * Returns data for ALL sales reps across ALL columns in one batch
   */
  static async getSalesRepReportsUltraFast(division, salesReps, columns) {
    try {
      const tableName = this.getTableName(division);
      
      // Result structure: { salesRep: { kgs: {...}, amount: {...}, customers: [...] } }
      const ultraFastData = {};
      
      // Initialize structure for all sales reps
      salesReps.forEach(salesRep => {
        const upperSalesRep = String(salesRep).trim().toUpperCase();
        ultraFastData[upperSalesRep] = {
          kgs: {},
          amount: {},
          morm: {},
          customers: []
        };
        
        // Initialize column data
        columns.forEach(column => {
          const columnKey = column.columnKey;
          ultraFastData[upperSalesRep].kgs[columnKey] = {};
          ultraFastData[upperSalesRep].amount[columnKey] = {};
          ultraFastData[upperSalesRep].morm[columnKey] = {};
        });
      });
      
      // Query each column period separately
      for (const column of columns) {
        const monthsArray = this.getMonthsForColumn(column);
        const year = parseInt(column.year);
        const dataType = column.type || 'Actual';
        const columnKey = column.columnKey;
        
        // Build placeholders for sales reps
        const salesRepPlaceholders = salesReps.map((_, index) => `$${index + 1}`).join(', ');
        const monthPlaceholders = monthsArray.map((_, idx) => `$${salesReps.length + 2 + idx}`).join(', ');
        
        // Query for product groups and values
        const query = `
          SELECT 
            TRIM(UPPER(salesrepname)) as salesrepname,
            productgroup,
            customername,
            values_type,
            SUM(values) as total_value 
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) IN (${salesRepPlaceholders}) 
          AND year = $${salesReps.length + 1}
          AND month IN (${monthPlaceholders})
          AND UPPER(type) = UPPER($${salesReps.length + 2 + monthsArray.length})
          GROUP BY TRIM(UPPER(salesrepname)), productgroup, customername, values_type
        `;
        
        const params = [
          ...salesReps.map(rep => String(rep).trim().toUpperCase()),
          year,
          ...monthsArray,
          dataType
        ];
        
        console.log(`🚀 Querying ALL sales rep reports for ${columnKey}: year=${year}, months=${monthsArray}, type=${dataType}`);
        
        const result = await pool.query(query, params);
        
        console.log(`⚡ Got ${result.rows.length} rows for ${columnKey}`);
        
        // Organize results by sales rep, product group, and value type
        result.rows.forEach(row => {
          const salesRep = row.salesrepname;
          const productGroup = row.productgroup;
          const customer = row.customername;
          const valueType = row.values_type?.toUpperCase();
          const value = parseFloat(row.total_value) || 0;
          
          if (!ultraFastData[salesRep]) return;
          
          // Store by value type
          if (valueType === 'KGS' || valueType === 'QUANTITY') {
            if (!ultraFastData[salesRep].kgs[columnKey][productGroup]) {
              ultraFastData[salesRep].kgs[columnKey][productGroup] = 0;
            }
            ultraFastData[salesRep].kgs[columnKey][productGroup] += value;
            
            // Also track customer data for KGS
            if (customer) {
              const existingCustomer = ultraFastData[salesRep].customers.find(c => 
                c.name === customer && c.columnKey === columnKey
              );
              if (existingCustomer) {
                existingCustomer.kgs = (existingCustomer.kgs || 0) + value;
              } else {
                ultraFastData[salesRep].customers.push({
                  name: customer,
                  columnKey,
                  kgs: value,
                  amount: 0
                });
              }
            }
          } else if (valueType === 'AMOUNT') {
            if (!ultraFastData[salesRep].amount[columnKey][productGroup]) {
              ultraFastData[salesRep].amount[columnKey][productGroup] = 0;
            }
            ultraFastData[salesRep].amount[columnKey][productGroup] += value;
            
            // Also track customer data for Amount
            if (customer) {
              const existingCustomer = ultraFastData[salesRep].customers.find(c => 
                c.name === customer && c.columnKey === columnKey
              );
              if (existingCustomer) {
                existingCustomer.amount = (existingCustomer.amount || 0) + value;
              } else {
                ultraFastData[salesRep].customers.push({
                  name: customer,
                  columnKey,
                  kgs: 0,
                  amount: value
                });
              }
            }
          } else if (valueType === 'MORM' || valueType === 'RM') {
            if (!ultraFastData[salesRep].morm[columnKey][productGroup]) {
              ultraFastData[salesRep].morm[columnKey][productGroup] = 0;
            }
            ultraFastData[salesRep].morm[columnKey][productGroup] += value;
          }
        });
      }
      
      console.log(`⚡ ULTRA-FAST Processed reports data for ${Object.keys(ultraFastData).length} sales reps across ${columns.length} columns`);
      return ultraFastData;
      
    } catch (error) {
      console.error('❌ Error in ULTRA-FAST sales rep reports query:', error);
      throw error;
    }
  }

  /**
   * Helper method to get months array for a column
   */
  static getMonthsForColumn(column) {
    if (column.month === 'Q1') return [1, 2, 3];
    if (column.month === 'Q2') return [4, 5, 6];
    if (column.month === 'Q3') return [7, 8, 9];
    if (column.month === 'Q4') return [10, 11, 12];
    if (column.month === 'HY1') return [1, 2, 3, 4, 5, 6];
    if (column.month === 'HY2') return [7, 8, 9, 10, 11, 12];
    if (column.month === 'Year') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    // Handle month names
    const monthNum = this.monthMapping[column.month];
    return monthNum ? [monthNum] : [1]; // Default to January if not found
  }

  /**
   * Normalize an input array of months/periods into an array of month numbers (1-12)
   * Accepts values like 'January', 'HY1', 'Q1', 1, '1'.
   */
  static normalizeMonths(months) {
    const asArray = Array.isArray(months) ? months : [months];
    const expanded = [];
    for (const m of asArray) {
      if (typeof m === 'number') {
        expanded.push(m);
      } else if (typeof m === 'string') {
        const trimmed = m.trim();
        // Quarter
        if (this.quarterMonths[trimmed]) {
          expanded.push(...this.quarterMonths[trimmed]);
          continue;
        }
        // Half-year
        if (this.halfYearMonths[trimmed]) {
          expanded.push(...this.halfYearMonths[trimmed]);
          continue;
        }
        // Full year keyword (FY or Year)
        if (/^(fy|year)$/i.test(trimmed)) {
          expanded.push(...this.fullYearMonths);
          continue;
        }
        // Month name
        if (this.monthMapping[trimmed]) {
          expanded.push(this.monthMapping[trimmed]);
          continue;
        }
        // Numeric string
        const asNum = Number(trimmed);
        if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) {
          expanded.push(asNum);
          continue;
        }
      }
    }
    // Deduplicate and sort for stable queries
    return Array.from(new Set(expanded)).sort((a, b) => a - b);
  }

  /**
   * Get months array based on period selection
   */
  static getMonthsArray(period) {
    if (period === 'FY' || period === 'Year') {
      return this.fullYearMonths;
    } else if (this.quarterMonths[period]) {
      return this.quarterMonths[period];
    } else if (this.halfYearMonths[period]) {
      return this.halfYearMonths[period];
    } else if (this.monthMapping[period]) {
      return [this.monthMapping[period]];
    } else {
      // Default to full year if period not recognized
      return this.fullYearMonths;
    }
  }

  /**
   * Get table name for a division
   */
  static getTableName(division) {
    const tableMap = {
      'FP': 'fp_data_excel',
      'SB': 'sb_data_excel',
      'TF': 'tf_data_excel',
      'HCM': 'hcm_data_excel'
    };
    
    const tableName = tableMap[division];
    if (!tableName) {
      throw new Error(`Unsupported division: ${division}`);
    }
    
    return tableName;
  }

  /**
   * Get countries for a specific division
   */
  static async getCountriesByDivision(division) {
    try {
      const tableName = this.getTableName(division);
      
      const query = `
        SELECT DISTINCT countryname as country, salesrepname
        FROM ${tableName}
        WHERE countryname IS NOT NULL 
        ORDER BY countryname
      `;
      
      console.log(`🔍 Executing query: ${query}`);
      const result = await pool.query(query);
      console.log(`📊 Found ${result.rows.length} countries in database`);
      console.log(`📋 Countries:`, result.rows.map(row => row.country));
      
      return result.rows.map(row => ({
        country: row.country,
        salesrepname: row.salesrepname
      }));
    } catch (error) {
      console.error(`Error fetching countries for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get unique sales reps for a specific division
   */
  static async getSalesRepsByDivision(division) {
    try {
      const tableName = this.getTableName(division);
      
      const query = `
        SELECT DISTINCT salesrepname
        FROM ${tableName}
        WHERE salesrepname IS NOT NULL 
        ORDER BY salesrepname
      `;
      
      console.log(`🔍 Executing sales reps query: ${query}`);
      const result = await pool.query(query);
      console.log(`📊 Found ${result.rows.length} sales reps in database`);
      
      return result.rows.map(row => this.toProperCase(row.salesrepname));
      
    } catch (error) {
      console.error(`Error getting sales reps for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get sales by country for a specific division, sales rep, year, months (array), and data type
   */
  static async getSalesByCountry(division, salesRep, year, months, dataType = 'Actual', groupMembers = null) {
    try {
      const tableName = this.getTableName(division);
      let query, params;
      
      // Normalize months to numeric values (1-12)
      const monthsArray = this.normalizeMonths(months);
      
      if (groupMembers && groupMembers.length > 0) {
        // It's a group - get sales by country for all members
        const placeholders = groupMembers.map((_, index) => `$${index + 1}`).join(', ');
        const monthPlaceholders = monthsArray.map((_, idx) => `$${groupMembers.length + 2 + idx}`).join(', ');
        query = `
          SELECT countryname, SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_value 
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) IN (${placeholders}) 
          AND year = $${groupMembers.length + 1}
          AND month IN (${monthPlaceholders})
          AND UPPER(type) = UPPER($${groupMembers.length + 2 + monthsArray.length})
          AND countryname IS NOT NULL
          AND TRIM(countryname) != ''
          GROUP BY countryname
          ORDER BY total_value DESC
        `;
        params = [...groupMembers.map(n => String(n).trim().toUpperCase()), year, ...monthsArray, dataType];
      } else if (salesRep && String(salesRep).trim() !== '' && String(salesRep).trim().toUpperCase() !== 'ALL') {
        // Individual sales rep
        const monthPlaceholders = monthsArray.map((_, idx) => `$${3 + idx}`).join(', ');
        query = `
          SELECT countryname, SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_value 
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) = $1 
          AND year = $2
          AND month IN (${monthPlaceholders})
          AND UPPER(type) = UPPER($${3 + monthsArray.length})
          AND countryname IS NOT NULL
          AND TRIM(countryname) != ''
          GROUP BY countryname
          ORDER BY total_value DESC
        `;
        params = [String(salesRep).trim().toUpperCase(), year, ...monthsArray, dataType];
      } else {
        // Aggregate across all sales reps
        const monthPlaceholders = monthsArray.map((_, idx) => `$${2 + idx}`).join(', ');
        query = `
          SELECT countryname, SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) as total_value 
          FROM ${tableName}
          WHERE year = $1
          AND month IN (${monthPlaceholders})
          AND UPPER(type) = UPPER($${2 + monthsArray.length})
          AND countryname IS NOT NULL
          AND TRIM(countryname) != ''
          GROUP BY countryname
          ORDER BY total_value DESC
        `;
        params = [year, ...monthsArray, dataType];
      }
      
      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        country: row.countryname,
        value: parseFloat(row.total_value || 0)
      }));
    } catch (error) {
      console.error(`Error fetching sales by country for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get total Amount by country for a division and year (ignores months/type)
   */
  static async getSalesByCountryAmountByYear(division, year) {
    const tableName = this.getTableName(division);
    const query = `
      SELECT countryname, SUM(CASE WHEN UPPER(values_type) = 'AMOUNT' THEN values ELSE 0 END) AS total_value
      FROM ${tableName}
      WHERE year = $1
        AND countryname IS NOT NULL
        AND TRIM(countryname) != ''
      GROUP BY countryname
      ORDER BY total_value DESC
    `;
    const params = [year];
    const result = await pool.query(query, params);
    return result.rows.map(r => ({ country: r.countryname, value: parseFloat(r.total_value || 0) }));
  }

  /**
   * Get countries for a specific sales rep in a division
   */
  static async getCountriesBySalesRep(division, salesRep, groupMembers = null) {
    try {
      const tableName = this.getTableName(division);
      let query, params;
      
      if (groupMembers && groupMembers.length > 0) {
        // It's a group - get countries for all members
        const placeholders = groupMembers.map((_, index) => `$${index + 1}`).join(', ');
        query = `
          SELECT DISTINCT countryname as country
          FROM ${tableName}
          WHERE salesrepname IN (${placeholders})
          AND countryname IS NOT NULL
          AND TRIM(countryname) != ''
          ORDER BY countryname
        `;
        params = groupMembers;
      } else {
        // Individual sales rep
        query = `
          SELECT DISTINCT countryname as country
          FROM ${tableName}
          WHERE salesrepname = $1
          AND countryname IS NOT NULL
          AND TRIM(countryname) != ''
          ORDER BY countryname
        `;
        params = [salesRep];
      }
      
      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        country: row.country
      }));
    } catch (error) {
      console.error(`Error fetching countries for sales rep in division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get sales data for a specific country
   */
  static async getCountrySalesData(division, country, year, months, dataType = 'Actual', valueType = 'KGS') {
    try {
      const tableName = this.getTableName(division);
      const monthsArray = this.normalizeMonths(months);
      
      const monthPlaceholders = monthsArray.map((_, idx) => `$${4 + idx}`).join(', ');
      const query = `
        SELECT 
          salesrepname,
          customername,
          productgroup,
          material,
          process,
          SUM(values) as total_value
        FROM ${tableName}
        WHERE countryname = $1
        AND year = $2
        AND month IN (${monthPlaceholders})
        AND type = $3
        AND values_type = $${3 + monthsArray.length + 1}
        GROUP BY salesrepname, customername, productgroup, material, process
        ORDER BY total_value DESC
      `;
      
      const params = [country, year, dataType, ...monthsArray, valueType];
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        salesRep: row.salesrepname,
        customer: row.customername,
        productGroup: row.productgroup,
        material: row.material,
        process: row.process,
        value: parseFloat(row.total_value || 0)
      }));
    } catch (error) {
      console.error(`Error fetching country sales data for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get all unique countries from database for a division
   */
  static async getAllCountries(division) {
    try {
      const tableName = this.getTableName(division);
      
      const query = `
        SELECT DISTINCT countryname 
        FROM ${tableName}
        WHERE countryname IS NOT NULL 
        AND TRIM(countryname) != ''
        AND countryname != '(blank)'
        ORDER BY countryname
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => row.countryname);
    } catch (error) {
      console.error(`Error fetching all countries for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get sales reps for a specific division
   */
  static async getSalesRepsByDivision(division) {
    try {
      const tableName = this.getTableName(division);
      
      const query = `
        SELECT DISTINCT salesrepname
        FROM ${tableName}
        WHERE salesrepname IS NOT NULL
        AND TRIM(salesrepname) != ''
        ORDER BY salesrepname
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => row.salesrepname);
    } catch (error) {
      console.error(`Error fetching sales reps for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get summary statistics for a division
   */
  static async getDivisionSummary(division) {
    try {
      const tableName = this.getTableName(division);
      
      const query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT salesrepname) as unique_sales_reps,
          COUNT(DISTINCT customername) as unique_customers,
          COUNT(DISTINCT countryname) as unique_countries,
          MIN(year) as min_year,
          MAX(year) as max_year,
          SUM(CASE WHEN values_type = 'KGS' THEN values ELSE 0 END) as total_kgs,
          SUM(CASE WHEN values_type = 'Amount' THEN values ELSE 0 END) as total_amount
        FROM ${tableName}
      `;
      
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching division summary for ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get all unique customers from database for a division
   */
  static async getAllCustomers(division) {
    try {
      const tableName = this.getTableName(division);
      
      const query = `
        SELECT DISTINCT customername as customer
        FROM ${tableName}
        WHERE customername IS NOT NULL
        AND TRIM(customername) != ''
        ORDER BY customername
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => row.customer);
    } catch (error) {
      console.error(`Error fetching customers for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get customers by sales rep for a specific division
   */
  static async getCustomersBySalesRep(division, salesRep, groupMembers = null) {
    try {
      const tableName = this.getTableName(division);
      let query, params;
      
      if (groupMembers && groupMembers.length > 0) {
        // It's a group - get customers for all members
        const placeholders = groupMembers.map((_, index) => `$${index + 1}`).join(', ');
        query = `
          SELECT DISTINCT customername as customer
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) IN (${placeholders})
          AND customername IS NOT NULL
          AND TRIM(customername) != ''
          ORDER BY customername
        `;
        params = groupMembers.map(n => String(n).trim().toUpperCase());
      } else {
        // Individual sales rep
        query = `
          SELECT DISTINCT customername as customer
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) = TRIM(UPPER($1))
          AND customername IS NOT NULL
          AND TRIM(customername) != ''
          ORDER BY customername
        `;
        params = [salesRep];
      }
      
      const result = await pool.query(query, params);
      return result.rows.map(row => row.customer);
    } catch (error) {
      console.error(`Error fetching customers for sales rep ${salesRep} in division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get sales by customer for a specific division, sales rep, year, months (array), and data type
   */
  static async getSalesByCustomer(division, salesRep, year, months, dataType = 'Actual', groupMembers = null, valueType = 'AMOUNT') {
    try {
      const tableName = this.getTableName(division);
      let query, params;
      
      // Normalize months to numeric values (1-12)
      const monthsArray = this.normalizeMonths(months);
      
      if (groupMembers && groupMembers.length > 0) {
        // It's a group - get sales by customer for all members
        const placeholders = groupMembers.map((_, index) => `$${index + 1}`).join(', ');
        const monthPlaceholders = monthsArray.map((_, idx) => `$${groupMembers.length + 2 + idx}`).join(', ');
        query = `
          SELECT customername, SUM(CASE WHEN UPPER(values_type) = UPPER($${groupMembers.length + 2 + monthsArray.length + 1}) THEN values ELSE 0 END) as total_value 
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) IN (${placeholders}) 
          AND year = $${groupMembers.length + 1}
          AND month IN (${monthPlaceholders})
          AND UPPER(type) = UPPER($${groupMembers.length + 2 + monthsArray.length})
          AND customername IS NOT NULL
          AND TRIM(customername) != ''
          GROUP BY customername
          ORDER BY total_value DESC
        `;
        params = [...groupMembers.map(n => String(n).trim().toUpperCase()), year, ...monthsArray, dataType];
      } else if (salesRep && String(salesRep).trim() !== '' && String(salesRep).trim().toUpperCase() !== 'ALL') {
        // Individual sales rep
        const monthPlaceholders = monthsArray.map((_, idx) => `$${3 + idx}`).join(', ');
        query = `
          SELECT customername, SUM(CASE WHEN UPPER(values_type) = UPPER($${2 + monthsArray.length + 2}) THEN values ELSE 0 END) as total_value 
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) = TRIM(UPPER($1))
          AND year = $2
          AND month IN (${monthPlaceholders})
          AND UPPER(type) = UPPER($${2 + monthsArray.length + 1})
          AND customername IS NOT NULL
          AND TRIM(customername) != ''
          GROUP BY customername
          ORDER BY total_value DESC
        `;
        params = [salesRep, year, ...monthsArray, dataType, valueType];
      } else {
        // All sales reps
        const monthPlaceholders = monthsArray.map((_, idx) => `$${2 + idx}`).join(', ');
        query = `
          SELECT customername, SUM(CASE WHEN UPPER(values_type) = UPPER($${1 + monthsArray.length + 2}) THEN values ELSE 0 END) as total_value 
          FROM ${tableName}
          WHERE year = $1
          AND month IN (${monthPlaceholders})
          AND UPPER(type) = UPPER($${1 + monthsArray.length + 1})
          AND customername IS NOT NULL
          AND TRIM(customername) != ''
          GROUP BY customername
          ORDER BY total_value DESC
        `;
        params = [year, ...monthsArray, dataType, valueType];
      }
      
      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        customer: row.customername,
        value: parseFloat(row.total_value || 0)
      }));
    } catch (error) {
      console.error(`Error fetching sales by customer for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get customer sales data for a specific customer and period
   */
  static async getCustomerSalesData(division, customer, year, months, dataType = 'Actual', valueType = 'KGS') {
    try {
      const tableName = this.getTableName(division);
      const monthsArray = this.normalizeMonths(months);
      
      const monthPlaceholders = monthsArray.map((_, idx) => `$${3 + idx}`).join(', ');
      const query = `
        SELECT 
          salesrepname,
          customername,
          productgroup,
          material,
          process,
          SUM(values) as total_value
        FROM ${tableName}
        WHERE customername = $1
        AND year = $2
        AND month IN (${monthPlaceholders})
        AND type = $${3 + monthsArray.length}
        AND values_type = $${3 + monthsArray.length + 1}
        GROUP BY salesrepname, customername, productgroup, material, process
        ORDER BY total_value DESC
      `;
      
      const params = [customer, parseInt(year), ...monthsArray, dataType, valueType];
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        salesRep: row.salesrepname,
        customer: row.customername,
        productGroup: row.productgroup,
        material: row.material,
        process: row.process,
        value: parseFloat(row.total_value || 0)
      }));
    } catch (error) {
      console.error(`Error fetching customer sales data for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get customer sales data by value type for a specific sales rep
   */
  static async getCustomerSalesDataByValueType(division, salesRep, customer, valueType, year, month, dataType = 'Actual') {
    try {
      const tableName = this.getTableName(division);
      const monthNum = this.monthMapping[month] || parseInt(month) || 1;
      
      const query = `
        SELECT SUM(values) as total_value
        FROM ${tableName}
        WHERE TRIM(UPPER(salesrepname)) = TRIM(UPPER($1))
        AND customername = $2
        AND year = $3
        AND month = $4
        AND UPPER(type) = UPPER($5)
        AND UPPER(values_type) = UPPER($6)
      `;
      
      const params = [salesRep, customer, parseInt(year), monthNum, dataType, valueType];
      const result = await pool.query(query, params);
      
      return parseFloat(result.rows[0]?.total_value || 0);
    } catch (error) {
      console.error(`Error fetching customer sales data by value type for division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get customer sales data for a group of sales reps
   */
  static async getCustomerSalesDataForGroup(division, groupMembers, customer, valueType, year, month, dataType = 'Actual') {
    try {
      const tableName = this.getTableName(division);
      const monthNum = this.monthMapping[month] || parseInt(month) || 1;
      const placeholders = groupMembers.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        SELECT SUM(values) as total_value
        FROM ${tableName}
        WHERE TRIM(UPPER(salesrepname)) IN (${placeholders})
        AND customername = $${groupMembers.length + 1}
        AND year = $${groupMembers.length + 2}
        AND month = $${groupMembers.length + 3}
        AND UPPER(type) = UPPER($${groupMembers.length + 4})
        AND UPPER(values_type) = UPPER($${groupMembers.length + 5})
      `;
      
      const params = [
        ...groupMembers.map(n => String(n).trim().toUpperCase()),
        customer,
        parseInt(year),
        monthNum,
        dataType,
        valueType
      ];
      
      const result = await pool.query(query, params);
      return parseFloat(result.rows[0]?.total_value || 0);
    } catch (error) {
      console.error(`Error fetching customer sales data for group in division ${division}:`, error);
      throw error;
    }
  }

  /**
   * Get product groups for a specific sales rep in a division
   */
  static async getProductGroupsBySalesRep(division, salesRep, groupMembers = null) {
    try {
      const tableName = this.getTableName(division);
      let query, params;
      
      if (groupMembers && groupMembers.length > 0) {
        // It's a group - get product groups for all members
        const placeholders = groupMembers.map((_, index) => `$${index + 1}`).join(', ');
        query = `
          SELECT DISTINCT productgroup
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) IN (${placeholders})
          AND productgroup IS NOT NULL
          AND TRIM(productgroup) != ''
          ORDER BY productgroup
        `;
        params = groupMembers.map(n => String(n).trim().toUpperCase());
      } else {
        // Individual sales rep
        query = `
          SELECT DISTINCT productgroup
          FROM ${tableName}
          WHERE TRIM(UPPER(salesrepname)) = TRIM(UPPER($1))
          AND productgroup IS NOT NULL
          AND TRIM(productgroup) != ''
          ORDER BY productgroup
        `;
        params = [salesRep];
      }
      
      const result = await pool.query(query, params);
      return result.rows.map(row => row.productgroup);
    } catch (error) {
      console.error(`Error fetching product groups for sales rep ${salesRep} in division ${division}:`, error);
      throw error;
    }
  }
}

module.exports = UniversalSalesByCountryService;

