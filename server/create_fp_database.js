// Script to create fp_database and set up tables
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connect to default postgres database first
const defaultPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default database
    password: '654883',
    port: 5432,
});

async function createDatabase() {
    try {
        console.log('🔄 Creating fp_database...');
        
        // Create the database
        await defaultPool.query('CREATE DATABASE fp_database');
        console.log('✅ fp_database created successfully');
        
        // Close connection to default database
        await defaultPool.end();
        
        // Now connect to the new database and run setup script
        const fpPool = new Pool({
            user: 'postgres',
            host: 'localhost',
            database: 'fp_database',
            password: '654883',
            port: 5432,
        });
        
        console.log('🔄 Setting up tables and indexes...');
        
        // Read and execute the setup SQL script
        const setupSQL = fs.readFileSync('../setup_fp_database.sql', 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = setupSQL.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await fpPool.query(statement);
                } catch (err) {
                    // Skip errors for statements that might already exist
                    if (!err.message.includes('already exists')) {
                        console.log('⚠️ SQL Warning:', err.message);
                    }
                }
            }
        }
        
        console.log('✅ Database setup completed successfully');
        
        // Test the connection and show table info
        const result = await fpPool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'fp_data'
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length > 0) {
            console.log('📊 FP Data table structure:');
            result.rows.forEach(row => {
                console.log(`   • ${row.column_name}: ${row.data_type}`);
            });
        }
        
        await fpPool.end();
        console.log('🎉 fp_database is ready for use!');
        
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('ℹ️ fp_database already exists, proceeding with setup...');
            
            // Database exists, just run setup
            const fpPool = new Pool({
                user: 'postgres',
                host: 'localhost',
                database: 'fp_database',
                password: '654883',
                port: 5432,
            });
            
            try {
                const setupSQL = fs.readFileSync('../setup_fp_database.sql', 'utf8');
                const statements = setupSQL.split(';').filter(stmt => stmt.trim().length > 0);
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        try {
                            await fpPool.query(statement);
                        } catch (setupErr) {
                            if (!setupErr.message.includes('already exists')) {
                                console.log('⚠️ Setup Warning:', setupErr.message);
                            }
                        }
                    }
                }
                
                console.log('✅ Database setup completed');
                await fpPool.end();
            } catch (setupError) {
                console.error('❌ Setup error:', setupError.message);
                await fpPool.end();
            }
        } else {
            console.error('❌ Database creation error:', err.message);
        }
    }
}

createDatabase().then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
}).catch(err => {
    console.error('❌ Script failed:', err.message);
    process.exit(1);
});