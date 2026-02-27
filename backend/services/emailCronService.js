const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { fetchEmails } = require('./emailService');

const logFile = path.join(__dirname, '../logs/email-cron.log');
function log(msg) {
    const time = new Date().toLocaleString();
    const entry = `[${time}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(entry);
}

/**
 * EmailCronService - Automated Email Fetching Service
 * 
 * This service manages scheduled email fetching using node-cron
 * - Runs every 5 minutes by default
 * - Implements retry logic for failed attempts
 * - Provides graceful error handling and recovery
 */
class EmailCronService {
    constructor() {
        this.task = null;
        this.retryCount = 0;
        this.maxRetries = 3; // Maximum retry attempts for failed fetches
    }

    /**
     * Start the cron job for scheduled email fetching
     * - Prevents multiple instances from running
     * - Sets up 5-minute interval scheduling
     * - Runs initial fetch immediately
     */
    start() {
        if (this.task) {
            console.log('⚠️ Email cron job already running');
            return;
        }

        console.log('🕐 Starting email fetch cron job (every 5 minutes)');

        // Schedule email fetching every 5 minutes
        this.task = cron.schedule('*/5 * * * *', async () => {
            console.log(`\n[${new Date().toLocaleTimeString()}] 🔄 Scheduled email fetch...`);
            this.retryCount = 0; // Reset retry count for each scheduled run
            await this.fetchWithRetry();
        }, {
            scheduled: false
        });

        this.task.start();

        // Run immediately on start to get current emails
        this.runOnce();

        console.log('✅ Email cron job started successfully');
    }

    /**
     * Fetch emails with retry logic
     * - Attempts up to maxRetries times on failure
     - Implements exponential backoff (30 seconds between retries)
     * - Resets retry count on successful fetch
     */
    async fetchWithRetry() {
        try {
            log('🔄 Starting email fetch...');
            const result = await fetchEmails();
            log(`✅ Scheduled fetch completed`);
            this.retryCount = 0; // Reset retry count on success
        } catch (error) {
            log(`❌ Scheduled fetch failed (attempt ${this.retryCount + 1}/${this.maxRetries}): ${error.message}`);

            this.retryCount++;
            if (this.retryCount < this.maxRetries) {
                console.log(`🔄 Retrying in 30 seconds...`);
                setTimeout(async () => {
                    await this.fetchWithRetry();
                }, 30000); // Wait 30 seconds before retry
            } else {
                console.error('❌ Max retries reached. Will try again on next scheduled run.');
                this.retryCount = 0; // Reset for next cycle
            }
        }
    }

    /**
     * Run email fetch once (immediate execution)
     * - Used for initial startup fetch
     * - Resets retry count before execution
     */
    async runOnce() {
        console.log('🔄 Running initial email fetch...');
        this.retryCount = 0;
        await this.fetchWithRetry();
    }

    /**
     * Stop the cron job gracefully
     * - Stops the scheduled task
     * - Cleans up resources
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('🛑 Email cron job stopped');
        }
    }

    /**
     * Get current service status
     * @returns {Object} Service status information
     */
    status() {
        return {
            running: this.task !== null,
            nextRun: this.task ? this.task.nextDates().toString() : null,
            retryCount: this.retryCount
        };
    }
}

// Export singleton instance for application-wide use
module.exports = new EmailCronService();
