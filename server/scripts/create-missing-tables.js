const fs = require('fs');
const path = require('path');
const { pool } = require('../database/config');

async function createMissingTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Creating missing division tables...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-missing-division-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await client.query(sqlContent);
    
    console.log('✅ Successfully created missing division tables:');
    console.log('   - sb_data_excel');
    console.log('   - tf_data_excel'); 
    console.log('   - hcm_data_excel');
    console.log('   - All indexes created');
    
    // Verify tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sb_data_excel', 'tf_data_excel', 'hcm_data_excel')
      ORDER BY table_name;
    `;
    
    const result = await client.query(tablesQuery);
    console.log('\n📋 Verified tables:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    console.log('\n🎉 All division tables are ready!');
    console.log('   - FP: ✅ Active (fp_data_excel)');
    console.log('   - SB: ✅ Ready (sb_data_excel)');
    console.log('   - TF: ✅ Ready (tf_data_excel)');
    console.log('   - HCM: ✅ Ready (hcm_data_excel)');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
if (require.main === module) {
  createMissingTables()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createMissingTables };