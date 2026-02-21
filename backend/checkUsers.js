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
        const [cols] = await conn.query('DESCRIBE users');
        console.log('Columns of users:', cols);

        const [rows] = await conn.query('SELECT * FROM users');
        console.log('User data:', rows);
    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        if (conn) await conn.end();
    }
}
check();
