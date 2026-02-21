const { fetchEmails } = require('./services/emailService');
console.log('Manually triggering email extraction...');
fetchEmails();
