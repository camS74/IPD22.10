const { pool } = require('./config');

class CustomerMergeRulesService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Add a single customer merge rule (without deleting existing ones)
   */
  async addMergeRule(salesRep, division, mergeRule) {
    try {
      const query = `
        INSERT INTO customer_merge_rules 
        (sales_rep, division, merged_customer_name, original_customers, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (sales_rep, division, merged_customer_name) 
        DO UPDATE SET 
          original_customers = EXCLUDED.original_customers,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      const result = await this.pool.query(query, [
        salesRep,
        division,
        mergeRule.mergedName,
        JSON.stringify(mergeRule.originalCustomers),
        mergeRule.isActive !== false
      ]);
      
      return { success: true, message: 'Merge rule added successfully' };
    } catch (error) {
      console.error('Error adding merge rule:', error);
      throw error;
    }
  }

  /**
   * Save customer merge rules for a sales rep (REPLACES ALL - use for bulk operations)
   */
  async saveMergeRules(salesRep, division, mergeRules) {
    try {
      // Start transaction
      await this.pool.query('BEGIN');
      
      // Delete existing rules for this sales rep and division
      await this.pool.query(
        'DELETE FROM customer_merge_rules WHERE sales_rep = $1 AND division = $2',
        [salesRep, division]
      );
      
      // Insert new rules
      for (const rule of mergeRules) {
        const query = `
          INSERT INTO customer_merge_rules 
          (sales_rep, division, merged_customer_name, original_customers, is_active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (sales_rep, division, merged_customer_name) 
          DO UPDATE SET 
            original_customers = EXCLUDED.original_customers,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP
        `;
        
        await this.pool.query(query, [
          salesRep,
          division,
          rule.mergedName,
          JSON.stringify(rule.originalCustomers),
          rule.isActive !== false
        ]);
      }
      
      // Commit transaction
      await this.pool.query('COMMIT');
      
      return { success: true, message: 'Merge rules saved successfully' };
    } catch (error) {
      // Rollback transaction
      await this.pool.query('ROLLBACK');
      console.error('Error saving merge rules:', error);
      throw error;
    }
  }

  /**
   * Get customer merge rules for a sales rep
   */
  async getMergeRules(salesRep, division) {
    try {
      const query = `
        SELECT 
          merged_customer_name,
          original_customers,
          is_active,
          created_at,
          updated_at
        FROM customer_merge_rules 
        WHERE sales_rep = $1 AND division = $2 AND is_active = true
        ORDER BY created_at DESC
      `;
      
      const result = await this.pool.query(query, [salesRep, division]);
      
      return result.rows.map(row => ({
        mergedName: row.merged_customer_name,
        originalCustomers: row.original_customers,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching merge rules:', error);
      throw error;
    }
  }

  /**
   * Delete a specific merge rule
   */
  async deleteMergeRule(salesRep, division, mergedCustomerName) {
    try {
      const query = `
        DELETE FROM customer_merge_rules 
        WHERE sales_rep = $1 AND division = $2 AND merged_customer_name = $3
      `;
      
      const result = await this.pool.query(query, [salesRep, division, mergedCustomerName]);
      
      return { 
        success: true, 
        message: 'Merge rule deleted successfully',
        deletedCount: result.rowCount
      };
    } catch (error) {
      console.error('Error deleting merge rule:', error);
      throw error;
    }
  }

  /**
   * Check if merge rules exist for a sales rep
   */
  async hasMergeRules(salesRep, division) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM customer_merge_rules 
        WHERE sales_rep = $1 AND division = $2 AND is_active = true
      `;
      
      const result = await this.pool.query(query, [salesRep, division]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking merge rules:', error);
      throw error;
    }
  }

  /**
   * Reset all merge rules (for testing/development)
   */
  async resetAllMergeRules() {
    try {
      const query = 'DELETE FROM customer_merge_rules';
      const result = await this.pool.query(query);
      
      return { 
        success: true, 
        message: 'All merge rules have been reset',
        deletedCount: result.rowCount
      };
    } catch (error) {
      console.error('Error resetting all merge rules:', error);
      throw error;
    }
  }

  /**
   * Get all merge rules for a division (admin view)
   */
  async getAllMergeRulesForDivision(division) {
    try {
      const query = `
        SELECT 
          sales_rep,
          merged_customer_name,
          original_customers,
          is_active,
          created_at,
          updated_at
        FROM customer_merge_rules 
        WHERE division = $1 AND is_active = true
        ORDER BY sales_rep, created_at DESC
      `;
      
      const result = await this.pool.query(query, [division]);
      
      return result.rows.map(row => ({
        salesRep: row.sales_rep,
        mergedName: row.merged_customer_name,
        originalCustomers: row.original_customers,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching all merge rules for division:', error);
      throw error;
    }
  }
}

module.exports = new CustomerMergeRulesService();
