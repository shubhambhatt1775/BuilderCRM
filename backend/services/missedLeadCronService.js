const cron = require('node-cron');
const missedLeadService = require('./missedLeadService');

/**
 * Missed Lead Cron Service
 * 
 * This service schedules automated missed lead detection and follow-up
 * Runs every 5 minutes for testing (change back to 6 hours for production)
 */
class MissedLeadCronService {
    constructor() {
        this.task = null;
        this.isRunning = false;
    }

    /**
     * Start the missed lead cron job
     * Schedule: Every 5 minutes (for testing)
     */
    start() {
        if (this.task) {
            console.log('⚠️ Missed lead cron job is already running');
            return;
        }

        console.log('🕒 Starting missed lead cron job (runs every 5 minutes for testing)...');

        // Schedule to run every 5 minutes for testing
        const cronExpression = '*/5 * * * *';
        this.task = cron.schedule(cronExpression, async () => {
            if (this.isRunning) {
                console.log('⚠️ Missed lead processing already running, skipping this execution');
                return;
            }

            this.isRunning = true;
            
            try {
                console.log('🚀 Starting scheduled missed lead processing...');
                const startTime = Date.now();
                
                const results = await missedLeadService.processMissedLeads();
                
                const duration = Date.now() - startTime;
                console.log(`✅ Scheduled missed lead processing completed in ${duration}ms`);
                console.log(`📊 Results: ${results.successful}/${results.total} successful, ${results.failed} failed, ${results.skipped} skipped`);
                
                if (results.errors.length > 0) {
                    console.log(`❌ Errors encountered: ${results.errors.length}`);
                    results.errors.forEach(error => {
                        console.log(`   - Lead ${error.leadId} (${error.leadName}): ${error.error}`);
                    });
                }
            } catch (error) {
                console.error('❌ Error in scheduled missed lead processing:', error);
            } finally {
                this.isRunning = false;
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Kolkata' // Adjust timezone as needed
        });

        this.task.start();
        console.log('✅ Missed lead cron job started successfully');
        
        // Log next execution time
        this.logNextExecution();
    }

    /**
     * Stop the missed lead cron job
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('⏹️ Missed lead cron job stopped');
        } else {
            console.log('⚠️ No missed lead cron job is running');
        }
    }

    /**
     * Run missed lead processing manually (for testing)
     */
    async runManually() {
        if (this.isRunning) {
            console.log('⚠️ Missed lead processing already running');
            return;
        }

        this.isRunning = true;
        
        try {
            console.log('🚀 Starting manual missed lead processing...');
            const startTime = Date.now();
            
            const results = await missedLeadService.processMissedLeads();
            
            const duration = Date.now() - startTime;
            console.log(`✅ Manual missed lead processing completed in ${duration}ms`);
            console.log(`📊 Results: ${results.successful}/${results.total} successful, ${results.failed} failed, ${results.skipped} skipped`);
            
            if (results.errors.length > 0) {
                console.log(`❌ Errors encountered: ${results.errors.length}`);
                results.errors.forEach(error => {
                    console.log(`   - Lead ${error.leadId} (${error.leadName}): ${error.error}`);
                });
            }

            return results;
        } catch (error) {
            console.error('❌ Error in manual missed lead processing:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Get missed lead statistics
     */
    async getStats() {
        try {
            const stats = await missedLeadService.getMissedLeadStats();
            console.log('📊 Current missed lead statistics:');
            console.log(`   Total leads: ${stats.total_leads}`);
            console.log(`   Missed follow-up sent: ${stats.missed_followup_sent}`);
            console.log(`   Currently missed: ${stats.currently_missed}`);
            console.log(`   Unassigned: ${stats.unassigned}`);
            console.log(`   No phone: ${stats.no_phone}`);
            console.log(`   Closed: ${stats.closed}`);
            
            return stats;
        } catch (error) {
            console.error('❌ Error getting missed lead stats:', error);
            throw error;
        }
    }

    /**
     * Log next execution time
     */
    logNextExecution() {
        if (!this.task) return;
        
        // Calculate next execution (5 minutes from now)
        const nextExecution = new Date();
        nextExecution.setMinutes(nextExecution.getMinutes() + 5);
        
        console.log(`📅 Next missed lead processing scheduled for: ${nextExecution.toLocaleString()}`);
    }

    /**
     * Get cron job status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isScheduled: !!this.task,
            nextExecution: this.task ? 'Every 5 minutes' : 'Not scheduled'
        };
    }
}

// Create singleton instance
const missedLeadCronService = new MissedLeadCronService();

module.exports = missedLeadCronService;
