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
        console.log(' ULTIMATE EMAIL FETCH - No restrictions!');
        console.log(' This will get ALL emails from your inbox');
        
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
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    console.log(` Total emails in INBOX: ${box.messages.total}`);
                    console.log(` Fetching ALL emails (no restrictions)...`);

                    // Fetch all emails from inbox (no date limits)
                    imap.search(['ALL'], async (err, results) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        console.log(` Found ${results.length} emails, processing ALL...`);
                        
                        if (results.length === 0) {
                            resolve({ processed: 0, skipped: 0, total: 0 });
                            return;
                        }

                        // Get current number of unknown clients to start numbering
                        const [unknownRows] = await pool.query("SELECT COUNT(*) as count FROM leads WHERE customer_name LIKE 'unknown client%'");
                        let unknownCounter = unknownRows[0].count;

                        // Process emails in batches to avoid memory issues
                        const fetch = imap.fetch(results, { bodies: '', struct: true });
                        let processedCount = 0;
                        let skippedCount = 0;

                        fetch.on('message', (msg, seqno) => {
                            const buffer = [];
                            
                            msg.on('body', (stream, info) => {
                                stream.on('data', (chunk) => {
                                    buffer.push(chunk);
                                });
                                stream.once('end', async () => {
                                    try {
                                        const email = Buffer.concat(buffer).toString('utf8');
                                        const parsed = await simpleParser(email);
                                        
                                        // Extract lead information from email headers
                                        const senderEmail = parsed.from?.value?.[0]?.address || '';
                                        const senderName = parsed.from?.value?.[0]?.name || senderEmail.split('@')[0];
                                        const subject = parsed.subject || '';
                                        const body = parsed.text || '';
                                        
                                        // NEW: Extract lead details from email text body as requested
                                        let customerName = '';
                                        let customerEmail = '';
                                        let customerPhone = '';

                                        // Regex patterns for Name, Email, Phone in body
                                        const nameRegex = /(?:Name|Lead Name|Customer|Client):\s*(.*)/i;
                                        const emailRegex = /(?:Email|Mail|ID):\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
                                        const phoneRegexBody = /(?:Mobile|Phone|Contact|Number|WA):\s*([+\d\s-]{10,15})/i;

                                        const nameMatch = body.match(nameRegex);
                                        const emailMatch = body.match(emailRegex);
                                        const phoneMatchBody = body.match(phoneRegexBody);

                                        if (nameMatch) {
                                            customerName = nameMatch[1].trim();
                                        } else {
                                            unknownCounter++;
                                            customerName = `unknown client${unknownCounter}`;
                                        }

                                        if (emailMatch) {
                                            customerEmail = emailMatch[1].trim();
                                        } else {
                                            customerEmail = 'no email';
                                        }

                                        if (phoneMatchBody) {
                                            customerPhone = phoneMatchBody[1].replace(/\D/g, '').trim();
                                        } else {
                                            // Fallback to original general phone regex
                                            const generalPhoneRegex = /(?:\+?(\d{1,3})?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4,5})|\b\d{10,15}\b)/g;
                                            const generalMatch = body.match(generalPhoneRegex) || subject.match(generalPhoneRegex);
                                            customerPhone = generalMatch ? generalMatch[0].replace(/\D/g, '') : '';
                                        }
                                        
                                        // Detect email source (MagicBricks, GitHub, etc.)
                                        let source = 'Direct Email';
                                        if (subject.includes('MagicBricks') || subject.includes('99Acres')) {
                                            source = 'MagicBricks';
                                        } else if (subject.includes('GitHub') || senderEmail.includes('github.com')) {
                                            source = 'GitHub';
                                        } else if (subject.includes('Housing') || subject.includes('Housing.com')) {
                                            source = 'Housing';ce
                                            
                                            
                                        } else if (subject.includes('Vercel') || senderEmail.includes('vercel.com')) {
                                            source = 'Vercel';
                                        }

                                        // Check for duplicate emails (same sender + subject within last day)
                                        try {
                                            const [existing] = await pool.query(
                                                'SELECT id FROM leads WHERE sender_email = ? AND subject = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)',
                                                [senderEmail, subject]
                                            );

                                            if (existing.length === 0) {
                                                // Insert new lead into database with WhatsApp fields and extracted customer info
                                                const [insertResult] = await pool.query(
                                                    'INSERT INTO leads (sender_name, sender_email, phone, subject, body, status, source, whatsapp_greeting_sent, customer_name, customer_email, customer_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                                    [senderName, senderEmail, customerPhone, subject, body, 'New', source, false, customerName, customerEmail, customerPhone]
                                                );
                                                
                                                const leadId = insertResult.insertId;
                                                processedCount++;
                                                console.log(` [${processedCount}] [${source}] NEW: ${senderEmail} - "${subject.substring(0, 50)}..."`);

                                                // Send WhatsApp greeting if phone number is available
                                                if (customerPhone && customerPhone.length >= 10) {
                                                    try {
                                                        console.log(`📱 Sending WhatsApp greeting for lead ${leadId} to ${customerPhone}`);
                                                        
                                                        // Create greeting message from email content
                                                        let greetingMessage = `Hello 👋\nWelcome ${customerName}!\n`;
                                                        
                                                        // Add subject if available
                                                        if (subject && subject.trim()) {
                                                            greetingMessage += `Regarding: ${subject}\n\n`;
                                                        }
                                                        
                                                        // Add relevant part of email body (first 200 characters)
                                                        if (body && body.trim()) {
                                                            const cleanBody = body.replace(/\n+/g, ' ').trim();
                                                            const shortBody = cleanBody.length > 200 ? cleanBody.substring(0, 200) + '...' : cleanBody;
                                                            greetingMessage += `Message: ${shortBody}\n\n`;
                                                        }
                                                        
                                                        greetingMessage += `Our salesman will reach you soon!!\n\nThanks for reaching out. Our team will contact you shortly.`;
                                                        
                                                        const greetingResult = await whatsappService.sendGreeting(customerPhone, customerName, leadId, greetingMessage);
                                                        
                                                        if (greetingResult.success) {
                                                            // Mark greeting as sent in database
                                                            await whatsappService.markGreetingAsSent(leadId);
                                                            console.log(`✅ WhatsApp greeting sent successfully for lead ${leadId}`);
                                                        } else {
                                                            console.log(`⚠️ WhatsApp greeting failed for lead ${leadId}: ${greetingResult.error}`);
                                                        }
                                                    } catch (whatsappError) {
                                                        console.error(`❌ WhatsApp service error for lead ${leadId}:`, whatsappError.message);
                                                        // Don't fail the lead creation process if WhatsApp fails
                                                    }
                                                } else {
                                                    console.log(`📵 No valid phone number for lead ${leadId}, skipping WhatsApp greeting`);
                                                    await whatsappService.logSkippedMessage(leadId, customerName, 'No valid phone number found');
                                                }
                                            } else {
                                                skippedCount++;
                                                console.log(` [${skippedCount}] [${source}] SKIPPED: ${senderEmail} - "${subject.substring(0, 50)}..." (already in database)`);
                                            }
                                        } catch (dbErr) {
                                            console.error('Database Error:', dbErr);
                                        }
                                    } catch (parseErr) {
                                        console.error('Email Parse Error:', parseErr);
                                    }
                                });
                            });
                        });

                        fetch.once('error', (err) => {
                            console.error('Fetch Error:', err);
                            reject(err);
                        });

                        fetch.once('end', async () => {
                            console.log(' EMAIL FETCHING COMPLETED!');
                            console.log(` Processed: ${processedCount} emails`);
                            console.log(` Skipped: ${skippedCount} emails`);
                            console.log(` Total found: ${results.length} emails`);
                            
                            // Mark all emails as seen to avoid reprocessing
                            imap.addFlags(results, ['\\Seen'], (err) => {
                                if (err) console.error('Error marking emails as seen:', err);
                                imap.end();
                            });
                            
                            resolve({ processed: processedCount, skipped: skippedCount, total: results.length });
                        });
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
