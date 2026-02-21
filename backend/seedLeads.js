const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'builder_crm'
        });

        await conn.query(`
            INSERT INTO leads (sender_name, sender_email, subject, body, status) 
            VALUES (?, ?, ?, ?, ?)
        `, ['John Doe', 'john@example.com', 'Inquiry for 3BHK Apartment', 'I am interested in your project at City Center. Please provide details and pricing.', 'New']);

        await conn.query(`
            INSERT INTO leads (sender_name, sender_email, subject, body, status) 
            VALUES (?, ?, ?, ?, ?)
        `, ['Jane Smith', 'jane.s@gmail.com', 'Site Visit Request', 'I would like to visit the site this Saturday. Is someone available?', 'New']);

        console.log('Successfully added 2 sample leads for testing.');
    } catch (e) {
        console.error('Seeding failed:', e.message);
    } finally {
        if (conn) await conn.end();
    }
}
seed();
