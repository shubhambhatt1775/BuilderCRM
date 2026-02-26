const Imap = require('imap');
const { simpleParser } = require('mailparser');
const pool = require('./config/db');
const axios = require('axios');
const whatsappService = require('./services/whatsappService');
require('dotenv').config();

/**
 * fetchAllEmailsUltimate - Primary Email Fetching Function
 * 
 * This function connects to IMAP server and fetches ALL emails from inbox
 * - Processes emails and converts them to leads
 * - Implements duplicate prevention logic
 * - Sends automated WhatsApp greetings
 * - Handles phone number extraction and source detection
 * 
 * @returns {Promise<Object>} Result object with processed, skipped, and total counts
 */
const fetchAllEmailsUltimate = async () => {
    try {
        console.log(' ULTIMATE EMAIL FETCH - 20 Minute Optimization');
        console.log(' This will only process emails received in the last 20 minutes');
        
        // Get credentials from environment variables for security
        const EMAIL_USER = process.env.EMAIL_USER;
        const EMAIL_PASS = process.env.EMAIL_PASS;
        
        if (!EMAIL_USER || !EMAIL_PASS) {
            throw new Error('Email credentials not found in .env file. Please set EMAIL_USER and EMAIL_PASS');
        }
        
        // IMAP configuration with enhanced TLS settings for better connection stability
        const imapConfig = {
            user: EMAIL_USER,
            password: EMAIL_PASS,
            host: 'cp-rsl02.sin02.ds.network',
            port: 993,
            tls: true,
            tlsOptions: { 
                rejectUnauthorized: false,
                servername: 'cp-rsl02.sin02.ds.network' // Explicit servername for TLS handshake
            },
            authTimeout: 30000, // Increased timeout for better reliability
            connTimeout: 30000,
            keepalive: {
                interval: 10000,
                idleInterval: 300000,
                forceNoop: true
            }
        };

        console.log(` Connecting to: ${EMAIL_USER}`);
        const imap = new Imap(imapConfig);

        return new Promise((resolve, reject) => {
            imap.once('ready', () => {
                imap.openBox('INBOX', false, async (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const totalMessages = box.messages.total;
                    console.log(` Total emails in INBOX: ${totalMessages}`);
                    
                    if (totalMessages === 0) {
                        imap.end();
                        resolve({ processed: 0, skipped: 0, total: 0 });
                        return;
                    }

                    // Calculate 20 minutes ago
                    const last20Min = new Date();
                    last20Min.setMinutes(last20Min.getMinutes() - 20);
                    console.log(` Processing window: Since ${last20Min.toLocaleString()}`);

                    // 1. Fetch headers only for the last 50 emails to find relevant ones
                    const checkRange = `${Math.max(1, totalMessages - 49)}:${totalMessages}`;
                    const headerFetch = imap.fetch(checkRange, { bodies: 'HEADER.FIELDS (DATE)' });
                    
                    const relevantUids = [];
                    
                    headerFetch.on('message', (msg, seqno) => {
                        msg.on('body', (stream, info) => {
                            let buffer = '';
                            stream.on('data', (chunk) => buffer += chunk.toString());
                            stream.once('end', async () => {
                                const header = Imap.parseHeader(buffer);
                                const emailDate = new Date(header.date ? header.date[0] : Date.now());
                                
                                if (emailDate >= last20Min) {
                                    // Use UID if possible, otherwise seqno
                                    relevantUids.push(seqno);
                                }
                            });
                        });
                    });

                    headerFetch.once('end', () => {
                        if (relevantUids.length === 0) {
                            console.log(' No new emails found in the last 20 minutes.');
                            imap.end();
                            resolve({ processed: 0, skipped: 0, total: totalMessages });
                            return;
                        }

                        console.log(` Found ${relevantUids.length} relevant emails. Fetching bodies...`);
                        
                        // 2. Fetch full bodies only for the relevant emails
                        const bodyFetch = imap.fetch(relevantUids, { bodies: '', struct: true });
                        const processingPromises = [];
                        let processedCount = 0;
                        let skippedCount = 0;

                        bodyFetch.on('message', (msg, seqno) => {
                            const bodyPromise = new Promise((pResolve) => {
                                const buffer = [];
                                msg.on('body', (stream) => {
                                    stream.on('data', (chunk) => buffer.push(chunk));
                                    stream.once('end', async () => {
                                        try {
                                            const email = Buffer.concat(buffer).toString('utf8');
                                            const parsed = await simpleParser(email);
                                            
                                            const senderEmail = parsed.from?.value?.[0]?.address || '';
                                            const senderName = parsed.from?.value?.[0]?.name || senderEmail.split('@')[0];
                                            const subject = parsed.subject || '';
                                            const body = parsed.text || '';
                                            
                                            let customerName = '';
                                            let customerEmail = '';
                                            let customerPhone = '';

                                            const nameRegex = /(?:Name|Lead Name|Customer|Client):\s*(.*)/i;
                                            const emailRegex = /(?:Email|Mail|ID):\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
                                            const phoneRegexBody = /(?:Mobile|Phone|Contact|Number|WA):\s*([+\d\s-]{10,15})/i;

                                            const nameMatch = body.match(nameRegex);
                                            const emailMatch = body.match(emailRegex);
                                            const phoneMatchBody = body.match(phoneRegexBody);

                                            if (nameMatch) {
                                                customerName = nameMatch[1].trim();
                                            } else {
                                                // Get current unknown client count
                                                const [countRows] = await pool.query("SELECT COUNT(*) as count FROM leads WHERE customer_name LIKE 'unknown client%'");
                                                customerName = `unknown client${countRows[0].count + 1}`;
                                            }

                                            customerEmail = emailMatch ? emailMatch[1].trim() : 'no email';

                                            if (phoneMatchBody) {
                                                customerPhone = phoneMatchBody[1].replace(/\D/g, '').trim();
                                            } else {
                                                const generalPhoneRegex = /(?:\+?(\d{1,3})?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4,5})|\b\d{10,15}\b)/g;
                                                const generalMatch = body.match(generalPhoneRegex) || subject.match(generalPhoneRegex);
                                                customerPhone = generalMatch ? generalMatch[0].replace(/\D/g, '') : '';
                                            }
                                            
                                            let source = 'Direct Email';
                                            if (subject.includes('MagicBricks') || subject.includes('99Acres')) source = 'MagicBricks';
                                            else if (subject.includes('GitHub') || senderEmail.includes('github.com')) source = 'GitHub';
                                            else if (subject.includes('Housing') || subject.includes('Housing.com')) source = 'Housing';
                                            else if (subject.includes('Vercel') || senderEmail.includes('vercel.com')) source = 'Vercel';

                                            const [existing] = await pool.query(
                                                'SELECT id FROM leads WHERE sender_email = ? AND subject = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)',
                                                [senderEmail, subject]
                                            );

                                            if (existing.length === 0) {
                                                const [insertResult] = await pool.query(
                                                    'INSERT INTO leads (sender_name, sender_email, phone, subject, body, status, source, whatsapp_greeting_sent, customer_name, customer_email, customer_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                                    [senderName, senderEmail, customerPhone, subject, body, 'New', source, false, customerName, customerEmail, customerPhone]
                                                );
                                                
                                                const leadId = insertResult.insertId;
                                                processedCount++;
                                                console.log(` [${processedCount}] NEW LEAD: ${senderEmail}`);

                                                if (customerPhone && customerPhone.length >= 10) {
                                                    try {
                                                        const greetingMessage = `Hello 👋 Welcome ${customerName}!\nOur team will contact you shortly regarding: ${subject}`;
                                                        await whatsappService.sendGreeting(customerPhone, customerName, leadId, greetingMessage);
                                                        await whatsappService.markGreetingAsSent(leadId);
                                                    } catch (waError) {
                                                        console.error(' WhatsApp Greeting Error:', waError.message);
                                                    }
                                                }
                                            } else {
                                                skippedCount++;
                                            }
                                            pResolve();
                                        } catch (err) {
                                            console.error(' Message processing error:', err);
                                            pResolve();
                                        }
                                    });
                                });
                            });
                            processingPromises.push(bodyPromise);
                        });

                        bodyFetch.once('end', async () => {
                            await Promise.all(processingPromises);
                            console.log(` FETCH COMPLETED. Processed: ${processedCount}, Skipped: ${skippedCount}`);
                            imap.end();
                            resolve({ processed: processedCount, skipped: skippedCount, total: totalMessages });
                        });

                        bodyFetch.once('error', (err) => {
                            console.error('Body Fetch Error:', err);
                            reject(err);
                        });
                    });

                    headerFetch.once('error', (err) => {
                        console.error('Header Fetch Error:', err);
                        reject(err);
                    });
                });
            });

            imap.once('error', (err) => {
                console.error('IMAP Connection Error:', err);
                reject(err);
            });

            imap.once('end', () => {
                console.log('IMAP Connection ended');
            });

            imap.connect();
        });
    } catch (error) {
        console.error('Ultimate fetch error:', error.message);
        throw error;
    }
};

module.exports = { fetchAllEmailsUltimate };
