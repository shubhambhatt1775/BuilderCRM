const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'builder_crm'
        });

        console.log('🔄 Running WhatsApp fields migration...');

        // Read and execute the migration file
        const migrationPath = path.join(__dirname, 'migrations', 'add_whatsapp_greeting_fields.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split the SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        // Execute each statement
        for (const statement of statements) {
            try {
                await connection.execute(statement);
                console.log('✅ Executed:', statement.substring(0, 50) + '...');
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log('ℹ️  Already exists:', statement.substring(0, 50) + '...');
                } else {
                    console.error('❌ Error executing statement:', err.message);
                }
            }
        }

        console.log('🎉 Migration completed successfully!');
        
        // Check final schema
        const [rows] = await connection.execute('DESCRIBE leads');
        console.log('\n📋 Current leads table columns:');
        rows.forEach(row => console.log(`  - ${row.Field}`));

        await connection.end();
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
