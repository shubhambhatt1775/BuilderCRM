const cron = require('node-cron');
const { fetchEmails } = require('../services/emailService');

// Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Auto-sync: Fetching emails...`);
    fetchEmails();
});

// Run once on startup
console.log('Force syncing emails on startup...');
fetchEmails();

console.log('Cron job scheduled for every 5 minutes.');
