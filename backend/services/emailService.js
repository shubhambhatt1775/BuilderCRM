const Imap = require('imap');
const { simpleParser } = require('mailparser');
const pool = require('../config/db');
const whatsappService = require('./whatsappService');
require('dotenv').config();

/**
 * fetchEmails - Alternative Email Fetching Service
 * 
 * This service provides email fetching functionality with enhanced configuration
 * - Uses environment variables for credentials
 * - Implements robust IMAP connection settings
 * - Provides phone number extraction and source detection
 * - Handles WhatsApp API integration for automated greetings
 * 
 * Used by manual fetch endpoints and alternative email processing
 */
const fetchEmails = () => {
    // Enhanced IMAP configuration with improved TLS settings
    const imapConfig = {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
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

    console.log(`Connecting to IMAP for ${imapConfig.user}...`);
    const imap = new Imap(imapConfig);

    /**
     * Open INBOX and fetch emails
     * - Processes emails and converts to leads
     * - Implements duplicate prevention logic
     * - Sends WhatsApp greetings when possible
     */
    function openInbox(cb) {
        imap.openBox('INBOX', false, cb);
    }

    // IMAP event handlers
    imap.once('ready', () => {
        openInbox((err, box) => {
            if (err) {
                console.error('Error opening inbox:', err);
                return;
            }

            // Fetch all emails from inbox
            imap.search(['ALL'], (err, results) => {
                if (err) {
                    console.error('Search error:', err);
                    return;
                }

                if (results.length === 0) {
                    console.log('No emails found');
                    imap.end();
                    return;
                }

                console.log(`Found ${results.length} emails, processing...`);

                // Fetch email content
                const fetch = imap.fetch(results, { bodies: '', struct: true });
                let processedCount = 0;

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
                                 
                                // Extract lead information
                                const senderEmail = parsed.from?.value?.[0]?.address || '';
                                const senderName = parsed.from?.value?.[0]?.name || senderEmail.split('@')[0];
                                const subject = parsed.subject || '';
                                const body = parsed.text || '';
                                 
                                // Extract phone number using regex patterns
                                const phoneRegex = /(?:\+?(\d{1,3})?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4,5})|\b\d{10,15}\b)/g;
                                const phoneMatch = body.match(phoneRegex) || subject.match(phoneRegex);
                                const phone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : '';
                                 
                                // Detect email source
                                let source = 'Direct Email';
                                if (subject.includes('MagicBricks') || subject.includes('99Acres')) {
                                    source = 'MagicBricks';
                                } else if (subject.includes('GitHub') || senderEmail.includes('github.com')) {
                                    source = 'GitHub';
                                } else if (subject.includes('Housing') || subject.includes('Housing.com')) {
                                    source = 'Housing';
                                } else if (subject.includes('Vercel') || senderEmail.includes('vercel.com')) {
                                    source = 'Vercel';
                                }

                                // Initial WhatsApp status
                                let whatsappStatus = 'Not Configured';

                                // Check for duplicate emails (same sender + subject within last day)
                                try {
                                    const [existing] = await pool.query(
                                        'SELECT id FROM leads WHERE sender_email = ? AND subject = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)',
                                        [senderEmail, subject]
                                    );

                                    if (existing.length === 0) {
                                        // Insert new lead into database
                                        await pool.query(
                                            'INSERT INTO leads (sender_name, sender_email, phone, subject, body, status, whatsapp_status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                            [senderName, senderEmail, phone, subject, body, 'New', whatsappStatus, source]
                                        );
                                        processedCount++;
                                        console.log(`✅ [${processedCount}/${results.length}] [${source}] New lead: ${senderEmail} - "${subject.substring(0, 50)}..."`);

                                        // Get the newly created lead ID
                                        const [newLead] = await pool.query(
                                            'SELECT id FROM leads WHERE sender_email = ? AND subject = ? ORDER BY id DESC LIMIT 1',
                                            [senderEmail, subject]
                                        );
                                        
                                        const leadId = newLead[0]?.id;

                                        // Send WhatsApp greeting using the WhatsApp service
                                        let whatsappStatus = 'Not Configured';
                                        if (phone && leadId) {
                                            try {
                                                // Check if greeting was already sent
                                                const alreadySent = await whatsappService.wasGreetingSent(phone);
                                                if (alreadySent) {
                                                    whatsappStatus = 'Already Sent';
                                                    console.log(`📱 WhatsApp greeting already sent to ${phone}`);
                                                } else {
                                                    // Send greeting
                                                    const result = await whatsappService.sendGreeting(phone, senderName, leadId);
                                                    
                                                    if (result.success) {
                                                        whatsappStatus = 'Sent';
                                                        // Mark as sent in database
                                                        await whatsappService.markGreetingAsSent(leadId);
                                                        console.log(`📱 WhatsApp greeting sent to ${phone}`);
                                                    } else {
                                                        whatsappStatus = 'Failed';
                                                        console.log(`❌ WhatsApp greeting failed for ${phone}: ${result.error}`);
                                                    }
                                                }

                                                // Update WhatsApp status in database
                                                await pool.query(
                                                    'UPDATE leads SET whatsapp_status = ? WHERE id = ?',
                                                    [whatsappStatus, leadId]
                                                );

                                            } catch (whatsappErr) {
                                                console.error('WhatsApp Service Error:', whatsappErr.message);
                                                whatsappStatus = 'Failed';
                                                
                                                // Update status even on failure
                                                if (leadId) {
                                                    await pool.query(
                                                        'UPDATE leads SET whatsapp_status = ? WHERE id = ?',
                                                        [whatsappStatus, leadId]
                                                    );
                                                }
                                            }
                                        } else {
                                            whatsappStatus = phone ? 'No Phone' : 'Not Configured';
                                            if (leadId) {
                                                await pool.query(
                                                    'UPDATE leads SET whatsapp_status = ? WHERE id = ?',
                                                    [whatsappStatus, leadId]
                                                );
                                            }
                                        }
                                    } else {
                                        console.log(`ℹ️ [${processedCount}/${results.length}] [${source}] Already exists: ${senderEmail} - "${subject.substring(0, 50)}..."`);
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
                });

                fetch.once('end', () => {
                    console.log('✅ Email fetching completed');
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
            console.error('❌ IMAP Error:', err.message);
        }
        // Don't crash, just log and end gracefully
        imap.end();
    });

    imap.once('end', () => {
        console.log('IMAP Connection ended');
    });

    imap.connect();
};

module.exports = { fetchEmails };
