const { pool } = require('./config');

class TFDataService {
  constructor() {
    this.pool = pool;
  }

  // Get unique product groups from tf_data_excel, excluding specified categories
  async getProductGroupsForMasterData() {
    try {
      // First get excluded categories from config
      const excludedCategories = await this.getExcludedProductGroups();
      
      // Build query with exclusions and case-insensitive filtering
      let query = `
        SELECT DISTINCT productgroup 
        FROM tf_data_excel 
        WHERE productgroup IS NOT NULL 
        AND productgroup != ''
        AND LOWER(productgroup) NOT IN (${excludedCategories.map(cat => `LOWER('${cat}')`).join(', ')})
        ORDER BY productgroup
      `;
      
      const result = await this.pool.query(query);
      
      // Format product group names to proper case
      return result.rows.map(row => this.formatProductGroupName(row.productgroup));
    } catch (error) {
      console.error('Error fetching TF product groups for master data:', error);
      throw error;
    }
  }

  // Format product group name to proper case
  formatProductGroupName(name) {
    if (!name) return name;
    
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Get excluded product groups from config
  async getExcludedProductGroups() {
    try {
      const result = await this.pool.query(
        'SELECT config_value FROM tf_master_config WHERE config_key = $1',
        ['excluded_product_groups']
      );
      
      if (result.rows.length > 0) {
        return result.rows[0].config_value;
      }
      
      // Default exclusions if config not found
      return ['Service Charges', 'Services Charges', 'Others', 'Other', 'Miscellaneous', 'Service', 'Charges'];
    } catch (error) {
      console.error('Error fetching TF excluded product groups:', error);
      return ['Service Charges', 'Services Charges', 'Others', 'Other', 'Miscellaneous', 'Service', 'Charges'];
    }
  }

  // Get all material percentages for TF
  async getMaterialPercentages() {
    try {
      const result = await this.pool.query(
        'SELECT * FROM tf_material_percentages ORDER BY product_group'
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching TF material percentages:', error);
      throw error;
    }
  }

  // Save material percentages for a product group
  async saveMaterialPercentage(productGroup, percentages) {
    try {
      // Handle both parameter formats (PE/pe, PP/bopp, etc.)
      const pe = percentages.PE || percentages.pe || 0;
      const bopp = percentages.PP || percentages.BOPP || percentages.bopp || 0;
      const pet = percentages.PET || percentages.pet || 0;
      const alu = percentages.Alu || percentages.alu || 0;
      const paper = percentages.Paper || percentages.paper || 0;
      const pvc_pet = percentages['PVC/PET'] || percentages.pvc_pet || 0;
      
      // Format the product group name to proper case
      const formattedProductGroup = this.formatProductGroupName(productGroup);
      
      const query = `
        INSERT INTO tf_material_percentages 
        (product_group, pe_percentage, bopp_percentage, pet_percentage, alu_percentage, paper_percentage, pvc_pet_percentage)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (product_group) 
        DO UPDATE SET 
          pe_percentage = EXCLUDED.pe_percentage,
          bopp_percentage = EXCLUDED.bopp_percentage,
          pet_percentage = EXCLUDED.pet_percentage,
          alu_percentage = EXCLUDED.alu_percentage,
          paper_percentage = EXCLUDED.paper_percentage,
          pvc_pet_percentage = EXCLUDED.pvc_pet_percentage,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [
        formattedProductGroup, pe, bopp, pet, alu, paper, pvc_pet
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error saving TF material percentage:', error);
      throw error;
    }
  }

  // Initialize material percentages for all product groups
  async initializeMaterialPercentages() {
    try {
      const productGroups = await this.getProductGroupsForMasterData();
      
      for (const productGroup of productGroups) {
        await this.saveMaterialPercentage(productGroup, {
          pe: 0,
          bopp: 0,
          pet: 0,
          alu: 0,
          paper: 0,
          pvc_pet: 0
        });
      }
      
      return productGroups;
    } catch (error) {
      console.error('Error initializing TF material percentages:', error);
      throw error;
    }
  }
}

module.exports = new TFDataService();
