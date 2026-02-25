const fs = require('fs').promises;
const path = require('path');

/**
 * Logging Service for WhatsApp Operations
 * 
 * This service provides structured logging for WhatsApp operations,
 * including success, failures, and retry attempts.
 */
class WhatsAppLogger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.logFile = path.join(this.logDir, 'whatsapp.log');
        this.errorFile = path.join(this.logDir, 'whatsapp-errors.log');
        this.ensureLogDirectory();
    }

    /**
     * Ensure log directory exists
     */
    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    /**
     * Write log entry to file
     * @param {string} filename - Log file path
     * @param {string} level - Log level (INFO, WARN, ERROR)
     * @param {string} message - Log message
     * @param {Object} data - Additional data to log
     */
    async writeLog(filename, level, message, data = {}) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                message,
                ...data
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(filename, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Log successful WhatsApp message
     * @param {string} phoneNumber - Phone number
     * @param {string} clientName - Client name
     * @param {number} leadId - Lead ID
     * @param {Object} apiResponse - API response
     */
    async logSuccess(phoneNumber, clientName, leadId, apiResponse) {
        const message = `WhatsApp greeting sent successfully`;
        const data = {
            phoneNumber,
            clientName,
            leadId,
            apiResponse: apiResponse ? 'success' : 'no_response'
        };
        
        await this.writeLog(this.logFile, 'INFO', message, data);
        console.log(`✅ ${message} to ${phoneNumber} (Lead: ${leadId})`);
    }

    /**
     * Log WhatsApp message failure
     * @param {string} phoneNumber - Phone number
     * @param {string} clientName - Client name
     * @param {number} leadId - Lead ID
     * @param {Error} error - Error object
     * @param {Object} apiError - API error response
     */
    async logError(phoneNumber, clientName, leadId, error, apiError = null) {
        const message = `WhatsApp greeting failed`;
        const data = {
            phoneNumber,
            clientName,
            leadId,
            errorMessage: error.message,
            errorStack: error.stack,
            apiError: apiError || null
        };
        
        await this.writeLog(this.errorFile, 'ERROR', message, data);
        await this.writeLog(this.logFile, 'ERROR', message, data);
        console.error(`❌ ${message} for ${phoneNumber} (Lead: ${leadId}): ${error.message}`);
    }

    /**
     * Log retry attempt
     * @param {string} phoneNumber - Phone number
     * @param {number} leadId - Lead ID
     * @param {number} attempt - Attempt number
     * @param {string} reason - Reason for retry
     */
    async logRetry(phoneNumber, leadId, attempt, reason) {
        const message = `WhatsApp greeting retry attempt`;
        const data = {
            phoneNumber,
            leadId,
            attempt,
            reason
        };
        
        await this.writeLog(this.logFile, 'WARN', message, data);
        console.log(`🔄 ${message} ${attempt} for ${phoneNumber} (Lead: ${leadId}): ${reason}`);
    }

    /**
     * Log skipped WhatsApp message (no phone number)
     * @param {number} leadId - Lead ID
     * @param {string} clientName - Client name
     * @param {string} reason - Reason for skipping
     */
    async logSkipped(leadId, clientName, reason) {
        const message = `WhatsApp greeting skipped`;
        const data = {
            leadId,
            clientName,
            reason
        };
        
        await this.writeLog(this.logFile, 'INFO', message, data);
        console.log(`📵 ${message} for ${clientName} (Lead: ${leadId}): ${reason}`);
    }

    /**
     * Get recent error logs for debugging
     * @param {number} limit - Number of recent logs to retrieve
     * @returns {Promise<Array>} Array of recent error logs
     */
    async getRecentErrors(limit = 10) {
        try {
            const content = await fs.readFile(this.errorFile, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);
            const recentLines = lines.slice(-limit);
            
            return recentLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { timestamp: null, level: 'ERROR', message: line };
                }
            });
        } catch (error) {
            console.error('Failed to read error logs:', error);
            return [];
        }
    }

    /**
     * Get WhatsApp statistics
     * @returns {Promise<Object>} WhatsApp messaging statistics
     */
    async getStats() {
        try {
            const content = await fs.readFile(this.logFile, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);
            
            const stats = {
                total: lines.length,
                success: 0,
                error: 0,
                skipped: 0,
                retry: 0
            };

            lines.forEach(line => {
                try {
                    const log = JSON.parse(line);
                    switch (log.level) {
                        case 'INFO':
                            if (log.message.includes('skipped')) {
                                stats.skipped++;
                            } else if (log.message.includes('successfully')) {
                                stats.success++;
                            }
                            break;
                        case 'ERROR':
                            stats.error++;
                            break;
                        case 'WARN':
                            stats.retry++;
                            break;
                    }
                } catch {
                    // Skip malformed log lines
                }
            });

            return stats;
        } catch (error) {
            console.error('Failed to get WhatsApp stats:', error);
            return { total: 0, success: 0, error: 0, skipped: 0, retry: 0 };
        }
    }
}

// Create singleton instance
const whatsappLogger = new WhatsAppLogger();

module.exports = whatsappLogger;
