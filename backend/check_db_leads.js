const pool = require('./config/db');

async function checkLeads() {
    try {
        const [rows] = await pool.query('SELECT id, phone, whatsapp_greeting_sent, whatsapp_greeting_sent_at FROM leads ORDER BY created_at DESC LIMIT 10');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error querying database:', error);
        process.exit(1);
    }
}

checkLeads();
