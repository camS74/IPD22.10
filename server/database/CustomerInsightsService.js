const { pool } = require('./config');
const CustomerMergeRulesService = require('./CustomerMergeRulesService');

class CustomerInsightsService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Get division-wide customer insights with merge rules applied
   * Returns top customer metrics for the entire division
   */
  async getCustomerInsights(division, year, months, dataType = 'Actual') {
    try {
      console.log(`🔍 Getting customer insights for division: ${division}, year: ${year}, months: [${months.join(', ')}], type: ${dataType}`);
      
      // Step 1: Get all customers with their sales values and most recent sales rep
      const customerData = await this.getRawCustomerData(division, year, months, dataType);
      console.log(`📊 Retrieved ${customerData.length} raw customer records`);
      
      // Step 2: Get all merge rules for the division
      const allMergeRules = await CustomerMergeRulesService.getAllMergeRulesForDivision(division);
      console.log(`📋 Retrieved ${allMergeRules.length} merge rules for division`);
      
      // Step 3: Apply merge rules per sales rep, then aggregate
      const mergedCustomers = await this.applyMergeRulesAndAggregate(customerData, allMergeRules);
      console.log(`✅ After merging: ${mergedCustomers.length} unique customers`);
      
      // Step 4: Calculate insights metrics
      const insights = this.calculateInsights(mergedCustomers);
      console.log(`✅ Customer insights calculated:`, {
        totalCustomers: insights.totalCustomers,
        topCustomer: insights.topCustomer,
        top3Customer: insights.top3Customer,
        top5Customer: insights.top5Customer
      });
      
      return insights;
    } catch (error) {
      console.error('❌ Error getting customer insights:', error);
      throw error;
    }
  }

  /**
   * Get raw customer data with their sales values and most recent sales rep
   * Uses the most recent date to determine which sales rep owns the customer
   */
  async getRawCustomerData(division, year, months, dataType) {
    try {
      const tableName = this.getTableName(division);
      const monthPlaceholders = months.map((_, idx) => `$${3 + idx}`).join(', ');
      
      // Simplified query - for now, just get customer data without the complex date logic
      // We'll handle the "latest sales rep" logic in the application layer
      const query = `
        SELECT 
          customername as customer,
          salesrepname as sales_rep,
          SUM(values) as total_value
        FROM ${tableName}
        WHERE year = $1
          AND type = $2
          AND month IN (${monthPlaceholders})
          AND values_type = 'AMOUNT'
          AND customername IS NOT NULL
          AND customername != ''
        GROUP BY customername, salesrepname
        ORDER BY total_value DESC
      `;
      
      const params = [parseInt(year), dataType, ...months];
      const result = await this.pool.query(query, params);
      
      // Handle multiple sales reps per customer by keeping the one with highest value
      const customerMap = new Map();
      
      result.rows.forEach(row => {
        const customer = row.customer;
        const value = parseFloat(row.total_value || 0);  // Fixed: was row.value, should be row.total_value
        
        if (!customerMap.has(customer) || customerMap.get(customer).value < value) {
          customerMap.set(customer, {
            customer: customer,
            salesRep: row.sales_rep,
            value: value
          });
        }
      });
      
      
      return Array.from(customerMap.values()).sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error('❌ Error fetching raw customer data:', error);
      throw error;
    }
  }

  /**
   * Apply merge rules per sales rep, then aggregate division-wide
   */
  async applyMergeRulesAndAggregate(customerData, allMergeRules) {
    try {
      // Group customers by sales rep
      const customersBySalesRep = {};
      customerData.forEach(customer => {
        if (!customersBySalesRep[customer.salesRep]) {
          customersBySalesRep[customer.salesRep] = [];
        }
        customersBySalesRep[customer.salesRep].push(customer);
      });
      
      // Apply merge rules per sales rep
      const mergedBySalesRep = {};
      
      for (const [salesRep, customers] of Object.entries(customersBySalesRep)) {
        // Get merge rules for this sales rep (case-insensitive comparison)
        const salesRepRules = allMergeRules.filter(rule => 
          rule.salesRep.toLowerCase().trim() === salesRep.toLowerCase().trim()
        );
        
        if (salesRepRules.length > 0) {
          console.log(`🔧 Applying ${salesRepRules.length} merge rules for sales rep: ${salesRep}`);
          mergedBySalesRep[salesRep] = this.applyMergeRulesForSalesRep(customers, salesRepRules);
        } else {
          console.log(`⚠️ No merge rules found for sales rep: ${salesRep} (checked ${allMergeRules.length} total rules)`);
          // No merge rules, keep customers as-is
          mergedBySalesRep[salesRep] = customers.map(c => ({
            name: c.customer,
            value: c.value,
            isMerged: false,
            originalCustomers: [c.customer]
          }));
        }
      }
      
      // Aggregate across all sales reps
      // If same customer name appears in multiple sales reps, combine them
      const aggregatedCustomers = {};
      
      for (const [salesRep, customers] of Object.entries(mergedBySalesRep)) {
        customers.forEach(customer => {
          const key = customer.name.toLowerCase().trim();
          
          if (aggregatedCustomers[key]) {
            // Customer already exists, add to value
            aggregatedCustomers[key].value += customer.value;
            aggregatedCustomers[key].salesReps.push(salesRep);
            
            // If either is merged, mark as merged
            if (customer.isMerged) {
              aggregatedCustomers[key].isMerged = true;
              aggregatedCustomers[key].originalCustomers = [
                ...new Set([...aggregatedCustomers[key].originalCustomers, ...customer.originalCustomers])
              ];
            }
          } else {
            // New customer
            aggregatedCustomers[key] = {
              name: customer.name,
              value: customer.value,
              isMerged: customer.isMerged,
              originalCustomers: customer.originalCustomers,
              salesReps: [salesRep]
            };
          }
        });
      }
      
      // Convert to array and sort by value
      return Object.values(aggregatedCustomers).sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error('❌ Error applying merge rules:', error);
      throw error;
    }
  }

  /**
   * Apply merge rules for a single sales rep's customers
   */
  applyMergeRulesForSalesRep(customers, mergeRules) {
    const processedCustomers = [];
    const processed = new Set();
    
    // Apply each merge rule
    mergeRules.forEach(rule => {
      const originalCustomers = rule.originalCustomers;
      
      // Find matching customers (case-insensitive)
      const matchingCustomers = customers.filter(customer => 
        originalCustomers.some(orig => 
          customer.customer.toLowerCase().trim() === orig.toLowerCase().trim()
        ) && !processed.has(customer.customer.toLowerCase().trim())
      );
      
      if (matchingCustomers.length > 0) {
        // Merge these customers
        const mergedValue = matchingCustomers.reduce((sum, c) => sum + c.value, 0);
        
        processedCustomers.push({
          name: rule.mergedName + '*',  // Add asterisk to show it's merged
          value: mergedValue,
          isMerged: true,
          originalCustomers: matchingCustomers.map(c => c.customer)
        });
        
        // Mark as processed
        matchingCustomers.forEach(c => processed.add(c.customer.toLowerCase().trim()));
        
        console.log(`  ✅ Merged ${matchingCustomers.length} customers into "${rule.mergedName}": ${mergedValue.toFixed(2)}`);
      }
    });
    
    // Add unprocessed customers
    customers.forEach(customer => {
      if (!processed.has(customer.customer.toLowerCase().trim())) {
        processedCustomers.push({
          name: customer.customer,
          value: customer.value,
          isMerged: false,
          originalCustomers: [customer.customer]
        });
      }
    });
    
    return processedCustomers;
  }

  /**
   * Calculate customer insights metrics
   */
  calculateInsights(customers) {
    // Calculate total sales
    const totalSales = customers.reduce((sum, c) => sum + c.value, 0);
    
    // Calculate percentages
    const customersWithPercent = customers.map(customer => ({
      ...customer,
      percent: totalSales > 0 ? (customer.value / totalSales * 100) : 0
    }));
    
    // Sort by percentage (descending)
    customersWithPercent.sort((a, b) => b.percent - a.percent);
    
    // Calculate metrics
    const topCustomer = customersWithPercent[0] ? customersWithPercent[0].percent.toFixed(1) + '%' : '-';
    const top3Customer = customersWithPercent.slice(0, 3).reduce((sum, c) => sum + c.percent, 0).toFixed(1) + '%';
    const top5Customer = customersWithPercent.slice(0, 5).reduce((sum, c) => sum + c.percent, 0).toFixed(1) + '%';
    const avgSalesPerCustomer = customers.length > 0 ? (totalSales / customers.length) : 0;
    
    return {
      customers: customersWithPercent,
      totalCustomers: customers.length,
      totalSales: totalSales,
      topCustomer: topCustomer,
      top3Customer: top3Customer,
      top5Customer: top5Customer,
      avgSalesPerCustomer: avgSalesPerCustomer
    };
  }

  /**
   * Get table name for division
   */
  getTableName(division) {
    const tableMap = {
      'FP': 'fp_data_excel',
      'IP': 'ip_data_excel',
      'PP': 'pp_data_excel'
    };
    
    const tableName = tableMap[division.toUpperCase()];
    if (!tableName) {
      throw new Error(`Unsupported division: ${division}`);
    }
    
    return tableName;
  }
}

module.exports = new CustomerInsightsService();

