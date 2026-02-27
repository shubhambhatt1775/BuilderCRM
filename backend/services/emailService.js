const Imap = require('imap');
const { simpleParser } = require('mailparser');
const pool = require('../config/db');
const whatsappService = require('./whatsappService');
require('dotenv').config();

/**
 * fetchEmails - Email Fetching Service
 * 
 * This service provides email fetching functionality with enhanced configuration
 * - Uses environment variables for credentials
 * - Implements robust IMAP connection settings
 * - Provides phone number extraction and source detection
 * - Handles WhatsApp API integration for automated greetings
 * 
 * Returns a Promise that resolves with { processed, skipped, total } stats.
 * Used by manual fetch endpoints and automated email cron processing.
 */
const fetchEmails = () => {
    return new Promise((resolve, reject) => {
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

        // Stats shared across callbacks
        let processedCount = 0;
        let skippedCount = 0;
        let totalCount = 0;

        function openInbox(cb) {
            imap.openBox('INBOX', false, cb);
        }

        // In-memory set to track phone numbers processed in this session to prevent race conditions
        const sessionProcessedPhones = new Set();

        imap.once('ready', () => {
            openInbox((err, box) => {
                if (err) {
                    console.error('Error opening inbox:', err);
                    imap.end();
                    return reject(err);
                }

                // Calculate 10 minutes ago
                const last10Min = new Date();
                last10Min.setMinutes(last10Min.getMinutes() - 10);

                console.log(`Searching for emails received since: ${last10Min.toLocaleString()}`);

                // Fetch emails from inbox (narrowed by date)
                imap.search([['SINCE', last10Min]], (err, results) => {
                    if (err) {
                        console.error('Search error:', err);
                        imap.end();
                        return reject(err);
                    }

                    if (results.length === 0) {
                        console.log('No emails found');
                        imap.end();
                        return; // resolve happens in imap.once('end') with { processed:0, skipped:0, total:0 }
                    }

                    console.log(`Found ${results.length} emails, processing...`);

                    // Fetch email content
                    const fetch = imap.fetch(results, { bodies: '', struct: true });
                    totalCount = results.length;

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


                                    // Raw header values (used as fallback only)
                                    const headerEmail = parsed.from?.value?.[0]?.address || '';
                                    const headerName = parsed.from?.value?.[0]?.name || headerEmail.split('@')[0];
                                    const subject = parsed.subject || '';
                                    const body = parsed.text || '';

                                    // ── Extract Name from BODY ──────────────────────────────────────
                                    // Tries common patterns: "Name: John", "Customer Name: John", etc.
                                    const nameFromBody = (() => {
                                        const patterns = [
                                            /(?:customer\s*name|client\s*name|full\s*name|your\s*name|name)\s*[:\-]\s*([^\n\r,|]+)/i,
                                            /^Name\s*[:\-]\s*(.+)$/im,
                                        ];
                                        for (const re of patterns) {
                                            const m = body.match(re);
                                            if (m && m[1]) {
                                                const val = m[1].trim();
                                                // Reject if the "name" looks like just a phone number
                                                if (val && !/^\d{6,}$/.test(val)) return val;
                                            }
                                        }
                                        return null;
                                    })();

                                    // ── Extract Email from BODY ─────────────────────────────────────
                                    // Looks for an email address sitting after "Email:" label or anywhere in body
                                    const emailFromBody = (() => {
                                        // Try labelled pattern first: "Email: x@y.com"
                                        const labelledMatch = body.match(
                                            /(?:e[\-\s]?mail|email\s*id|email\s*address)\s*[:\-]\s*([\w.+\-]+@[\w.\-]+\.[a-z]{2,})/i
                                        );
                                        if (labelledMatch) return labelledMatch[1].trim();
                                        // Fallback: first email address found anywhere in the body
                                        const anyEmail = body.match(/[\w.+\-]+@[\w.\-]+\.[a-z]{2,}/i);
                                        return anyEmail ? anyEmail[0].trim() : null;
                                    })();

                                    // ── Extract Phone from BODY ─────────────────────────────────────
                                    const phoneRegex = /\b(\+?\d[\d\s\-().]{8,}\d)\b/g;
                                    const phoneMatch = body.match(phoneRegex) || subject.match(phoneRegex);
                                    const rawPhone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : '';

                                    // Clean phone using WhatsApp service logic BEFORE deduping
                                    const phone = whatsappService.validateAndCleanPhone(rawPhone) || rawPhone;

                                    // ── Map to correct DB columns ─────────────────────────────────────────
                                    // sender_name / sender_email  → HEADER  (dedup key + "Direct Email From" badge)
                                    // customer_name / customer_email → BODY  (shown in Identity column on dashboard)
                                    const senderName = headerName || 'unknown';
                                    const senderEmail = headerEmail || 'no email';
                                    const customerName = nameFromBody || null;  // null → frontend falls back to sender_name
                                    const customerEmail = emailFromBody || null;  // null → frontend falls back to sender_email


                                    // Detect email source (use headerEmail for sender-domain checks)
                                    let source = 'Direct Email';
                                    if (subject.includes('MagicBricks') || subject.includes('99Acres')) {
                                        source = 'MagicBricks';
                                    } else if (subject.includes('GitHub') || headerEmail.includes('github.com')) {
                                        source = 'GitHub';
                                    } else if (subject.includes('Housing') || subject.includes('Housing.com')) {
                                        source = 'Housing';
                                    } else if (subject.includes('Vercel') || headerEmail.includes('vercel.com')) {
                                        source = 'Vercel';
                                    }

                                    // Initial WhatsApp status
                                    let whatsappStatus = 'Not Configured';

                                    // ── Dedup Logic ───────────────────────────────────────────────────
                                    try {
                                        // 1. Session Dedup: Don't process the same phone number twice in the same fetch execution
                                        if (phone && sessionProcessedPhones.has(phone)) {
                                            skippedCount++;
                                            console.log(`ℹ️ Session Dedup: Already processing phone ${phone}. Skipping duplicate.`);
                                            return;
                                        }
                                        if (phone) sessionProcessedPhones.add(phone);

                                        // 2. Database Dedup: Same subject from same actual sender (header email) within last day
                                        // OR Same phone number within the last 1 hour (to prevent greeting spam)
                                        const [existing] = await pool.query(
                                            `SELECT id FROM leads 
                                             WHERE (sender_email = ? AND subject = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY))
                                             OR (phone = ? AND phone != '' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR))`,
                                            [senderEmail, subject, phone]
                                        );

                                        if (existing.length === 0) {
                                            // Insert with header values in sender_* and body values in customer_*
                                            await pool.query(
                                                `INSERT INTO leads 
                                                    (sender_name, sender_email, customer_name, customer_email, 
                                                     phone, subject, body, status, whatsapp_status, source) 
                                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                [senderName, senderEmail, customerName, customerEmail,
                                                    phone, subject, body, 'New', whatsappStatus, source]
                                            );
                                            processedCount++;
                                            console.log(`✅ [${processedCount}/${totalCount}] [${source}] New lead: ${customerName || senderName} <${customerEmail || senderEmail}> (from: ${senderEmail}) - "${subject.substring(0, 50)}..."`);

                                            // Get the newly created lead ID
                                            const [newLead] = await pool.query(
                                                'SELECT id FROM leads WHERE sender_email = ? AND subject = ? ORDER BY id DESC LIMIT 1',
                                                [senderEmail, subject]
                                            );

                                            const leadId = newLead[0]?.id;

                                            // Send WhatsApp greeting using the WhatsApp service
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
                                                            whatsappStatus = result.error.includes('already sent') ? 'Already Sent' : 'Failed';
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
                                            skippedCount++;
                                            console.log(`ℹ️ [${source}] Already exists (dedup logic): ${senderEmail} / ${phone} - "${subject.substring(0, 50)}..."`);
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
                        console.log(`✅ Email fetching completed. Processed: ${processedCount}, Skipped: ${skippedCount}, Total: ${totalCount}`);
                        imap.end();
                    });
                });
            });
        });

        imap.once('error', (err) => {
            if (err.textCode === 'AUTHENTICATIONFAILED') {
                console.error('❌ IMAP Authentication Failed! Please check EMAIL_USER and EMAIL_PASS in .env');
            } else {
                console.error('❌ IMAP Error:', err.message);
            }
            reject(err);
        });

        imap.once('end', () => {
            console.log('IMAP Connection ended');
            // Resolve with actual processing stats
            resolve({ processed: processedCount, skipped: skippedCount, total: totalCount });
        });

        imap.connect();
    });
};

module.exports = { fetchEmails };
