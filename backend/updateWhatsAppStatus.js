const mysql = require('mysql2/promise');

async function updateWhatsAppStatus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'builder_crm'
    });
    
    console.log('🔄 Updating WhatsApp status for existing leads...');
    
    // Update leads that have phone numbers to show proper WhatsApp status
    const [result] = await connection.execute(
      `UPDATE leads 
       SET whatsapp_status = CASE 
         WHEN phone IS NULL OR phone = '' THEN 'No Phone'
         WHEN whatsapp_greeting_sent = TRUE THEN 'Sent'
         ELSE 'Not Configured'
       END
       WHERE whatsapp_status = 'Not Found' OR whatsapp_status IS NULL`
    );
    
    console.log(`✅ Updated ${result.affectedRows} leads with proper WhatsApp status`);
    
    // Show updated status
    const [rows] = await connection.execute('SELECT id, sender_name, phone, whatsapp_status FROM leads ORDER BY id DESC LIMIT 5');
    console.log('\n📋 Updated WhatsApp status:');
    rows.forEach(row => {
      console.log(`  ID: ${row.id}, Name: ${row.sender_name}, Phone: ${row.phone || 'None'}, WA Status: ${row.whatsapp_status}`);
    });
    
    await connection.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

updateWhatsAppStatus();
