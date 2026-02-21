const Imap = require('imap');
require('dotenv').config();

const imapConfig = {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
};

console.log('Testing connection with:');
console.log('User:', imapConfig.user);
console.log('Pass:', imapConfig.password.replace(/./g, '*')); // Masked

const imap = new Imap(imapConfig);

imap.once('ready', () => {
    console.log('✅ Success! Connection established.');
    imap.end();
});

imap.once('error', (err) => {
    console.error('❌ Connection Failed!');
    console.error('Error Type:', err.name);
    console.error('Error Code:', err.textCode);
    console.error('Message:', err.message);

    if (err.textCode === 'AUTHENTICATIONFAILED') {
        console.log('\n--- Troubleshooting Checklist ---');
        console.log('1. Is 2-Step Verification enabled on this account? (Required)');
        console.log('2. Is IMAP enabled in Gmail Settings > Forwarding and POP/IMAP?');
        console.log('3. Is the App Password exactly 16 characters (ignoring spaces)?');
        console.log('4. Are you sure this App Password was generated for THIS specific email address?');
    }
});

imap.once('end', () => {
    console.log('Connection closed.');
});

imap.connect();
