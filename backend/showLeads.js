const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'builder_crm'
    });
    const [rows] = await conn.query('SELECT sender_name, sender_email, subject, created_at FROM leads ORDER BY created_at DESC');
    console.log('Total Leads Found:', rows.length);
    if (rows.length > 0) {
        console.log('Latest Lead:', rows[0]);
    }
    await conn.end();
}
check();
