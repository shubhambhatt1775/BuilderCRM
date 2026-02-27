const axios = require('axios');

async function testWhatsAppAPI() {
    const apiEndpoint = 'https://www.vedikin.com/wa-schedule-message/schedule-message/';
    const testData = {
        phone_number: '917041612135', // Dummy valid format
        message: 'Test message from Antigravity'
    };

    console.log(`Testing WhatsApp API at ${apiEndpoint}...`);
    try {
        const response = await axios.post(apiEndpoint, testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ API Response Status:', response.status);
        console.log('✅ API Response Data (Type):', typeof response.data);

        if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
            console.log('⚠️ API returned an HTML page (likely a maintenance or coming soon page)!');
            console.log('Sample content:', response.data.substring(0, 100).replace(/\n/g, ' '));
        } else {
            console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
        }

        if (response.data === 'success' || (response.data && response.data.status === 'success')) {
            console.log('✅ API confirmed message scheduling.');
        } else {
            console.log('❌ API did NOT confirm message scheduling.');
        }
    } catch (error) {
        console.error('❌ API Error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
    }
}

testWhatsAppAPI();
