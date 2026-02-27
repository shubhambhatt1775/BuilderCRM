const Imap = require('imap');
const { simpleParser } = require('mailparser');
require('dotenv').config();

const testFetch = async () => {
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;
    
    const imapConfig = {
        user: EMAIL_USER,
        password: EMAIL_PASS,
        host: 'cp-rsl02.sin02.ds.network',
        port: 993,
        tls: true,
        tlsOptions: { 
            rejectUnauthorized: false,
            servername: 'cp-rsl02.sin02.ds.network'
        }
    };

    const imap = new Imap(imapConfig);

    const last20Min = new Date();
    last20Min.setMinutes(last20Min.getMinutes() - 20);

    console.log(`Current Local Time: ${new Date().toLocaleString()}`);
    console.log(`20 Minutes Ago threshold: ${last20Min.toLocaleString()}`);

    imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                console.error('OpenBox Error:', err);
                process.exit(1);
            }

            console.log(`Total messages in INBOX: ${box.messages.total}`);

            imap.search([['SINCE', last20Min]], async (err, results) => {
                if (err) {
                    console.error('Search Error:', err);
                    imap.end();
                    return;
                }

                console.log(`'SINCE' search returned ${results.length} messages.`);
                
                if (results.length === 0) {
                    console.log('No messages found since today.');
                    imap.end();
                    return;
                }

                const fetch = imap.fetch(results, { bodies: '' });
                let msgCount = 0;

                fetch.on('message', (msg, seqno) => {
                    const buffer = [];
                    msg.on('body', (stream, info) => {
                        stream.on('data', (chunk) => buffer.push(chunk));
                        stream.once('end', async () => {
                            msgCount++;
                            const email = Buffer.concat(buffer).toString('utf8');
                            const parsed = await simpleParser(email);
                            const emailDate = parsed.date || new Date();
                            
                            console.log(`[${msgCount}] Seq #${seqno}:`);
                            console.log(`    Date: ${emailDate.toLocaleString()} (Raw: ${parsed.date})`);
                            console.log(`    Subject: ${parsed.subject}`);
                            
                            const isWithin20 = emailDate >= last20Min;
                            console.log(`    Is within 20 mins? ${isWithin20}`);
                            
                            if (msgCount === results.length) {
                                imap.end();
                            }
                        });
                    });
                });

                fetch.once('error', (err) => {
                    console.error('Fetch error:', err);
                });
            });
        });
    });

    imap.once('error', (err) => {
        console.error('IMAP Error:', err);
    });

    imap.once('end', () => {
        console.log('IMAP Connection ended');
    });

    imap.connect();
};

testFetch();
