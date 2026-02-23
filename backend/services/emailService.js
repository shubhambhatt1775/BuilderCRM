const Imap = require('imap');
const { simpleParser } = require('mailparser');
const pool = require('../config/db');
require('dotenv').config();

const fetchEmails = () => {
    const imapConfig = {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
    };

    console.log(`Connecting to IMAP for ${imapConfig.user}...`);
    const imap = new Imap(imapConfig);

    function openInbox(cb) {
        imap.openBox('INBOX', false, cb);
    }

    imap.once('ready', () => {
        openInbox((err, box) => {
            if (err) throw err;

            // Search for all emails from the last 24 hours to ensure we don't miss read ones
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            imap.search(['ALL', ['SINCE', yesterday]], (err, results) => {
                if (err) throw err;
                if (!results.length) {
                    console.log('No recent emails found.');
                    imap.end();
                    return;
                }

                const f = imap.fetch(results, { bodies: '' });
                f.on('message', (msg, seqno) => {
                    msg.on('body', (stream, info) => {
                        simpleParser(stream, async (err, mail) => {
                            if (err) console.error(err);

                            const senderName = mail.from?.value[0]?.name || 'Anonymous';
                            const senderEmail = mail.from?.value[0]?.address;
                            const subject = mail.subject || '';
                            const body = mail.text || '';

                            // Determine Lead Source
                            let source = 'Direct Email';
                            const checkText = (subject + ' ' + body).toLowerCase();

                            if (checkText.includes('magicbricks')) source = 'MagicBricks';
                            else if (checkText.includes('housing.com')) source = 'Housing.com';
                            else if (checkText.includes('99acres')) source = '99Acres';
                            else if (checkText.includes('github')) source = 'GitHub';
                            else if (checkText.includes('vercel')) source = 'Vercel';
                            else if (checkText.includes('emailjs')) source = 'EmailJS';


                            // Robust Phone Number Extraction
                            const extractPhone = (text) => {
                                if (!text) return null;
                                // Labels to look for
                                const labelRegex = /(?:phone|mobile|contact|whatsapp|number|tel|contect|mobile no|phone no)[:\s]*(\+?[\d\s-]{8,20})/gi;
                                const labelMatch = labelRegex.exec(text);
                                if (labelMatch && labelMatch[1]) {
                                    const clean = labelMatch[1].trim().replace(/[^\d+]$/, '');
                                    if (clean.replace(/\D/g, '').length >= 10) return clean;
                                }
                                // Standalone 10-14 digit numbers
                                const standaloneRegex = /(\+?\d{1,4}[\s-]?)?(\d[\s-]?){9,11}\d/g;
                                const matches = text.match(standaloneRegex);
                                if (matches) {
                                    for (let m of matches) {
                                        const clean = m.trim();
                                        if (clean.replace(/\D/g, '').length >= 10) return clean;
                                    }
                                }
                                return null;
                            };

                            const phone = extractPhone(body + ' ' + subject);

                            // Send WhatsApp Greeting (Mock)
                            let whatsappStatus = 'Not Found';
                            if (phone) {
                                console.log(`[WhatsApp] Detected number ${phone}. Sending greeting...`);
                                whatsappStatus = 'Sent';
                            }

                            try {
                                // Check if lead already exists
                                const [existing] = await pool.query(
                                    'SELECT id FROM leads WHERE sender_email = ? AND subject = ?',
                                    [senderEmail, subject]
                                );

                                if (existing.length === 0) {
                                    await pool.query(
                                        'INSERT INTO leads (sender_name, sender_email, phone, subject, body, status, whatsapp_status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                        [senderName, senderEmail, phone, subject, body, 'New', whatsappStatus, source]
                                    );
                                    console.log(`✅ [${source}] New lead saved: ${senderEmail} | WhatsApp: ${whatsappStatus}`);
                                }
                            } catch (dbErr) {
                                console.error('Database Error:', dbErr);
                            }
                        });
                    });

                    // Mark as read after processing
                    msg.once('attributes', (attrs) => {
                        const uid = attrs.uid;
                        imap.addFlags(uid, ['\\Seen'], (err) => {
                            if (err) console.error('Error marking as read:', err);
                        });
                    });
                });

                f.once('error', (err) => {
                    console.log('Fetch error: ' + err);
                });

                f.once('end', () => {
                    console.log('Done fetching all messages!');
                    imap.end();
                });
            });
        });
    });

    imap.once('error', (err) => {
        if (err.textCode === 'AUTHENTICATIONFAILED') {
            console.error('❌ Gmail Authentication Failed! Please make sure you are using an APP PASSWORD, not your regular password.');
            console.error('🔗 How to generate: https://support.google.com/accounts/answer/185833');
        } else {
            console.error('Imap Error:', err);
        }
    });

    imap.once('end', () => {
        console.log('IMAP Connection ended');
    });

    imap.connect();
};

module.exports = { fetchEmails };
