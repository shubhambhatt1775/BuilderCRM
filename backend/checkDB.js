const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'builder_crm'
        });
        const [rows] = await conn.query('SHOW TABLES');
        console.log('Tables:', rows);

        const [users] = await conn.query('SHOW TABLES LIKE "users"');
        if (users.length > 0) {
            const [admin] = await conn.query('SELECT id, email, role FROM users WHERE email = "admin@example.com"');
            console.log('Admin found:', admin);
        } else {
            console.log('Users table is missing');
        }
    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        if (conn) await conn.end();
    }
}
check();
