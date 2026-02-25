const whatsappService = require('./services/whatsappService');

async function testWhatsAppService() {
    console.log('🧪 Testing WhatsApp Service...\n');

    try {
        // Test 1: Phone number validation
        console.log('📱 Test 1: Phone number validation');
        const testPhones = [
            '1234567890',      // Valid 10-digit
            '+911234567890',   // Valid with country code
            '9876543210',      // Valid 10-digit
            '123',             // Invalid - too short
            'abc1234567',      // Invalid - contains letters
            ''                 // Invalid - empty
        ];

        testPhones.forEach(phone => {
            const cleanPhone = whatsappService.validateAndCleanPhone(phone);
            console.log(`  ${phone} -> ${cleanPhone || 'INVALID'}`);
        });

        // Test 2: Get WhatsApp statistics
        console.log('\n📊 Test 2: Get WhatsApp statistics');
        const stats = await whatsappService.getStats();
        console.log('  WhatsApp Stats:', JSON.stringify(stats, null, 2));

        // Test 3: Get recent errors
        console.log('\n🔍 Test 3: Get recent errors');
        const errors = await whatsappService.getRecentErrors(5);
        console.log(`  Found ${errors.length} recent errors`);
        if (errors.length > 0) {
            errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.timestamp}: ${error.message}`);
            });
        }

        // Test 4: Test message template
        console.log('\n📝 Test 4: Message template');
        const testMessage = whatsappService.defaultGreeting.replace('{{Client Name}}', 'John Doe');
        console.log('  Sample message:');
        console.log('  ' + testMessage.split('\n').join('\n  '));

        console.log('\n✅ WhatsApp service tests completed successfully!');

    } catch (error) {
        console.error('❌ WhatsApp service test failed:', error);
    }
}

// Run the test
testWhatsAppService();
