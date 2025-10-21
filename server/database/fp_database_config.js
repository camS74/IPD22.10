// ============================================================
// FP Database Configuration
// Configuration for the new fp_database with merged Actual/Budget data
// ============================================================

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// FP Database connection configuration
const fpDatabaseConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'fp_database', // New dedicated database
    password: process.env.DB_PASSWORD || '654883',
    port: process.env.DB_PORT || 5432,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool for fp_database
const fpPool = new Pool(fpDatabaseConfig);

// Test connection function
const testFpConnection = async () => {
    try {
        const client = await fpPool.connect();
        console.log('✅ FP Database connected successfully');
        
        // Test query to verify table structure
        const result = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'fp_data_excel'
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length > 0) {
            console.log('📊 FP Data table structure verified:');
            result.rows.forEach(row => {
                console.log(`   • ${row.column_name}: ${row.data_type}`);
            });
        } else {
            console.log('⚠️ FP Data Excel table not found - please run transform fp excel to sql.ps1 first');
        }
        
        client.release();
        return true;
    } catch (err) {
        console.error('❌ FP Database connection error:', err.message);
        return false;
    }
};

// Query helper functions for fp_database
const fpQuery = async (text, params) => {
    const start = Date.now();
    try {
        const res = await fpPool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed FP query', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error('FP Database query error:', err);
        throw err;
    }
};

// Get client from pool
const getFpClient = async () => {
    return await fpPool.connect();
};

// Common queries for FP data
const fpQueries = {
    // Get all data with optional filters
    getAllData: (filters = {}) => {
        let query = 'SELECT * FROM fp_data_excel WHERE 1=1';
        const params = [];
        let paramCount = 0;
        
        if (filters.type) {
            paramCount++;
            query += ` AND UPPER(type) = UPPER($${paramCount})`;
            params.push(filters.type);
        }
        
        if (filters.year) {
            paramCount++;
            query += ` AND year = $${paramCount}`;
            params.push(filters.year);
        }
        
        if (filters.month) {
            paramCount++;
            query += ` AND month = $${paramCount}`;
            params.push(filters.month);
        }
        
        if (filters.salesrepname) {
            paramCount++;
            query += ` AND salesrepname ILIKE $${paramCount}`;
            params.push(`%${filters.salesrepname}%`);
        }
        
        query += ' ORDER BY year DESC, month DESC, salesrepname, type';
        
        return fpQuery(query, params);
    },
    
    // Get summary statistics
    getSummaryStats: () => {
        return fpQuery(`
            SELECT 
                type,
                COUNT(*) as record_count,
                COUNT(DISTINCT salesrepname) as unique_sales_reps,
                COUNT(DISTINCT customername) as unique_customers,
                MIN(year) as min_year,
                MAX(year) as max_year,
                SUM(CASE WHEN values_type = 'KGS' THEN values ELSE 0 END) as total_kgs,
                SUM(CASE WHEN values_type = 'Amount' THEN values ELSE 0 END) as total_amount
            FROM fp_data_excel 
            GROUP BY type
            ORDER BY type
        `);
    },
    
    // Get actual vs budget comparison
    getActualVsBudget: (year, month = null) => {
        let query = `
            SELECT 
                salesrepname,
                customername,
                productgroup,
                values_type,
                SUM(CASE WHEN UPPER(type) = 'ACTUAL' THEN values ELSE 0 END) as actual_value,
                SUM(CASE WHEN UPPER(type) = 'BUDGET' THEN values ELSE 0 END) as budget_value,
                SUM(CASE WHEN UPPER(type) = 'ACTUAL' THEN values ELSE 0 END) - 
                SUM(CASE WHEN UPPER(type) = 'BUDGET' THEN values ELSE 0 END) as variance
            FROM fp_data_excel 
            WHERE year = $1
        `;
        
        const params = [year];
        
        if (month) {
            query += ' AND month = $2';
            params.push(month);
        }
        
        query += `
            GROUP BY salesrepname, customername, productgroup, values_type
            HAVING SUM(CASE WHEN type = 'Actual' THEN values ELSE 0 END) > 0 
                OR SUM(CASE WHEN type = 'Budget' THEN values ELSE 0 END) > 0
            ORDER BY salesrepname, customername, values_type
        `;
        
        return fpQuery(query, params);
    },
    
    // Get data for specific sales rep
    getSalesRepData: (salesRepName, year = null) => {
        let query = 'SELECT * FROM fp_data_excel WHERE salesrepname ILIKE $1';
        const params = [`%${salesRepName}%`];
        
        if (year) {
            query += ' AND year = $2';
            params.push(year);
        }
        
        query += ' ORDER BY year DESC, month DESC, type, values_type';
        
        return fpQuery(query, params);
    }
};

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Closing FP database connections...');
    fpPool.end(() => {
        console.log('✅ FP database pool has ended');
        process.exit(0);
    });
});

module.exports = {
    fpPool,
    fpQuery,
    getFpClient,
    testFpConnection,
    fpQueries,
    fpDatabaseConfig
};

// Auto-test connection when module is loaded
if (require.main === module) {
    testFpConnection();
}