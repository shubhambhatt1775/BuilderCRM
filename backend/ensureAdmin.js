const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'builder_crm'
        });

        console.log('Ensuring users table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(191) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'salesman') DEFAULT 'salesman',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('admin123', 10);

        // Use REPLACE INTO to update if exists or insert if new
        // Note: REPLACE works if there is a UNIQUE key (email)
        await conn.query("INSERT IGNORE INTO users (name, email, password, role) VALUES ('Admin', 'admin@example.com', ?, 'admin')", [hash]);
        // Also update just in case password hash was wrong
        await conn.query("UPDATE users SET password = ? WHERE email = 'admin@example.com'", [hash]);

        console.log('Admin user ensured in users table.');

        const [rows] = await conn.query('SELECT email, role FROM users');
        console.log('Current users:', rows);

    } catch (err) {
        console.error('Fix script failed:', err.message);
    } finally {
        if (conn) await conn.end();
    }
}

fix();
