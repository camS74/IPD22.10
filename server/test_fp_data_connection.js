const { Pool } = require('pg');

// First connect to default postgres database to check available databases
const defaultPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '654883',
});

async function checkFPDataTable() {
  try {
    console.log('Testing connection to PostgreSQL...');
    console.log('Host: localhost');
    console.log('Port: 5432');
    console.log('User: postgres');
    
    const client = await defaultPool.connect();
    console.log('✅ Database connection successful!');
    
    // Check what databases exist
    const dbResult = await client.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false
      ORDER BY datname
    `);
    
    console.log('\nAvailable databases:');
    dbResult.rows.forEach(row => {
      console.log(`  ${row.datname}`);
    });
    
    client.release();
    
    // Try to find fp_data table in each database
    for (const dbRow of dbResult.rows) {
      const dbName = dbRow.datname;
      console.log(`\n--- Checking database: ${dbName} ---`);
      
      try {
        const dbPool = new Pool({
          host: 'localhost',
          port: 5432,
          database: dbName,
          user: 'postgres',
          password: '654883',
        });
        
        const dbClient = await dbPool.connect();
        
        // Check if fp_data table exists in this database
        const tableResult = await dbClient.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'fp_data'
        `);
        
        if (tableResult.rows.length > 0) {
          console.log(`✅ fp_data table found in database: ${dbName}`);
          
          // Check table structure
          const columnsResult = await dbClient.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'fp_data' 
            ORDER BY ordinal_position
          `);
          
          console.log('Table columns:');
          columnsResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type}`);
          });
          
          // Check if there's any data
          const countResult = await dbClient.query('SELECT COUNT(*) FROM fp_data');
          console.log(`Total records: ${countResult.rows[0].count}`);
          
          // Show sample data
          const sampleResult = await dbClient.query('SELECT * FROM fp_data LIMIT 3');
          console.log('Sample data (first 3 rows):');
          sampleResult.rows.forEach((row, index) => {
            console.log(`  Row ${index + 1}:`, row);
          });
          
          dbClient.release();
          await dbPool.end();
          return; // Found the table, exit
          
        } else {
          console.log(`❌ fp_data table not found in database: ${dbName}`);
          
          // List all tables in this database
          const allTablesResult = await dbClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
          `);
          
          console.log('Available tables:');
          allTablesResult.rows.forEach(row => {
            console.log(`  ${row.table_name}`);
          });
        }
        
        dbClient.release();
        await dbPool.end();
        
      } catch (error) {
        console.log(`❌ Error accessing database ${dbName}:`, error.message);
      }
    }
    
    console.log('\n❌ fp_data table not found in any database');
    
  } catch (error) {
    console.error('❌ Error checking databases:', error.message);
  } finally {
    await defaultPool.end();
  }
}

checkFPDataTable(); 