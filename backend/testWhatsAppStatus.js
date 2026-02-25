const mysql = require('mysql2/promise');

async function testWhatsAppStatus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'builder_crm'
    });
    
    // Check current WhatsApp statuses in database
    const [rows] = await connection.execute('SELECT id, sender_name, phone, whatsapp_status FROM leads ORDER BY id DESC LIMIT 5');
    console.log('Recent leads WhatsApp status:');
    rows.forEach(row => {
      console.log(`  ID: ${row.id}, Name: ${row.sender_name}, Phone: ${row.phone || 'None'}, WA Status: ${row.whatsapp_status}`);
    });
    
    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testWhatsAppStatus();
