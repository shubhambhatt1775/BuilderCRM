const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDB() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('Connected to MySQL.');

        await connection.query('DROP DATABASE IF EXISTS builder_crm');
        await connection.query('CREATE DATABASE builder_crm');
        await connection.query('USE builder_crm');
        console.log('Database builder_crm (re)created.');

        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

        // Split by semicolon, but be careful with triggers/procedures if any (none here)
        // Filtering out empty lines and comments
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                await connection.query(statement);
                console.log('Executed:', statement.substring(0, 50) + '...');
            } catch (err) {
                console.error('Error executing statement:', statement.substring(0, 50));
                console.error(err.message);
            }
        }

        // Fresh hash for admin
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('admin123', 10);
        await connection.query('UPDATE users SET password = ? WHERE email = ?', [hash, 'admin@example.com']);
        console.log('Admin password updated successfully.');

        console.log('Database initialization complete.');
    } catch (err) {
        console.error('Critical Error during DB setup:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

setupDB();
