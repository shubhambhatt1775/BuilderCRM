const pool = require('../config/db');
const whatsappService = require('./whatsappService');
const whatsappLogger = require('./whatsappLogger');

/**
 * Missed Lead Service for detecting and following up on missed leads
 * 
 * This service identifies leads that haven't received follow-up within 48 hours
 * and sends automated WhatsApp follow-back messages.
 */
class MissedLeadService {
    constructor() {
        this.followupMessage = `Sorry for the delayed response. We tried reaching you earlier.
Please stay connected with us.
Call us on {{phone}} or email {{email}}.`;
    }

    /**
     * Find all missed leads based on the defined criteria
     * @returns {Promise<Array>} Array of missed leads
     */
    async findMissedLeads() {
        try {
            const query = `
                SELECT l.id, l.sender_name, l.sender_email, l.phone, l.status, l.assigned_to,
                       u.name as salesman_name, u.email as salesman_email,
                       COALESCE(last_followup.last_followup_date, NULL) as last_followup_date
                FROM leads l
                LEFT JOIN users u ON l.assigned_to = u.id
                LEFT JOIN (
                    SELECT lead_id, MAX(created_at) as last_followup_date
                    FROM followups
                    GROUP BY lead_id
                ) last_followup ON l.id = last_followup.lead_id
                WHERE l.assigned_to IS NOT NULL
                  AND l.phone IS NOT NULL AND l.phone != ''
                  AND l.status NOT IN ('Deal Won', 'Not Interested')
                  AND l.missed_followup_sent = FALSE
                  AND (l.last_followup_at IS NULL 
                       OR l.last_followup_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)
                       OR last_followup.last_followup_date IS NULL 
                       OR last_followup.last_followup_date < DATE_SUB(NOW(), INTERVAL 48 HOUR))
                ORDER BY l.created_at ASC
            `;

            const [rows] = await pool.query(query);
            console.log(`🔍 Found ${rows.length} missed leads for follow-up`);
            return rows;
        } catch (error) {
            console.error('Error finding missed leads:', error);
            throw error;
        }
    }

    /**
     * Process missed leads and send follow-up messages
     * @returns {Promise<Object>} Processing results
     */
    async processMissedLeads() {
        const results = {
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };

        try {
            console.log('🚀 Starting missed lead processing...');
            
            const missedLeads = await this.findMissedLeads();
            results.total = missedLeads.length;

            for (const lead of missedLeads) {
                try {
                    results.processed++;
                    
                    // Send WhatsApp follow-up message
                    const messageResult = await this.sendMissedFollowup(lead);
                    
                    if (messageResult.success) {
                        results.successful++;
                        await this.markMissedFollowupAsSent(lead.id);
                        console.log(`✅ Sent missed follow-up to lead ${lead.id}: ${lead.sender_name}`);
                    } else {
                        results.failed++;
                        results.errors.push({
                            leadId: lead.id,
                            leadName: lead.sender_name,
                            error: messageResult.error
                        });
                        console.log(`❌ Failed to send missed follow-up to lead ${lead.id}: ${messageResult.error}`);
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        leadId: lead.id,
                        leadName: lead.sender_name,
                        error: error.message
                    });
                    console.error(`❌ Error processing lead ${lead.id}:`, error);
                }
            }

            console.log(`📊 Missed lead processing complete: ${results.successful}/${results.total} successful`);
            return results;
        } catch (error) {
            console.error('❌ Error in processMissedLeads:', error);
            throw error;
        }
    }

    /**
     * Send missed follow-up WhatsApp message
     * @param {Object} lead - Lead object
     * @returns {Promise<Object>} Message result
     */
    async sendMissedFollowup(lead) {
        try {
            // Prepare personalized message
            const personalizedMessage = this.followupMessage
                .replace('{{phone}}', lead.phone || 'our support number')
                .replace('{{email}}', lead.salesman_email || 'support@example.com');

            // Send WhatsApp message
            const result = await whatsappService.sendGreeting(
                lead.phone,
                lead.sender_name,
                lead.id,
                personalizedMessage
            );

            // Log the missed follow-up attempt
            if (result.success) {
                await whatsappLogger.logSuccess(
                    lead.phone,
                    lead.sender_name,
                    lead.id,
                    result.apiResponse,
                    'missed_followup'
                );
            } else {
                await whatsappLogger.logError(
                    lead.phone,
                    lead.sender_name,
                    lead.id,
                    new Error(result.error),
                    result.apiError,
                    'missed_followup'
                );
            }

            return result;
        } catch (error) {
            await whatsappLogger.logError(
                lead.phone,
                lead.sender_name,
                lead.id,
                error,
                null,
                'missed_followup'
            );
            throw error;
        }
    }

    /**
     * Mark missed follow-up as sent for a lead
     * @param {number} leadId - Lead ID
     * @returns {Promise<boolean>} True if update successful
     */
    async markMissedFollowupAsSent(leadId) {
        try {
            await pool.query(
                'UPDATE leads SET missed_followup_sent = TRUE, last_followup_at = NOW() WHERE id = ?',
                [leadId]
            );

            console.log(`✅ Marked missed follow-up as sent for lead ID: ${leadId}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to mark missed follow-up as sent for lead ID ${leadId}:`, error);
            return false;
        }
    }

    /**
     * Update last follow-up timestamp for a lead
     * @param {number} leadId - Lead ID
     * @returns {Promise<boolean>} True if update successful
     */
    async updateLastFollowup(leadId) {
        try {
            await pool.query(
                'UPDATE leads SET last_followup_at = NOW() WHERE id = ?',
                [leadId]
            );

            return true;
        } catch (error) {
            console.error(`❌ Failed to update last follow-up for lead ID ${leadId}:`, error);
            return false;
        }
    }

    /**
     * Get statistics about missed leads
     * @returns {Promise<Object>} Missed lead statistics
     */
    async getMissedLeadStats() {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    COUNT(*) as total_leads,
                    COUNT(CASE WHEN missed_followup_sent = TRUE THEN 1 END) as missed_followup_sent,
                    COUNT(CASE WHEN missed_followup_sent = FALSE AND assigned_to IS NOT NULL 
                               AND phone IS NOT NULL AND phone != '' 
                               AND status NOT IN ('Deal Won', 'Not Interested') 
                               AND (last_followup_at IS NULL 
                                    OR last_followup_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)) 
                               THEN 1 END) as currently_missed,
                    COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned,
                    COUNT(CASE WHEN phone IS NULL OR phone = '' THEN 1 END) as no_phone,
                    COUNT(CASE WHEN status IN ('Deal Won', 'Not Interested') THEN 1 END) as closed
                FROM leads
            `);

            return rows[0];
        } catch (error) {
            console.error('Error getting missed lead stats:', error);
            throw error;
        }
    }

    /**
     * Reset missed follow-up flag for testing purposes
     * @param {number} leadId - Optional lead ID, if not provided resets all
     * @returns {Promise<boolean>} True if reset successful
     */
    async resetMissedFollowupFlag(leadId = null) {
        try {
            const query = leadId 
                ? 'UPDATE leads SET missed_followup_sent = FALSE WHERE id = ?'
                : 'UPDATE leads SET missed_followup_sent = FALSE';
            
            const params = leadId ? [leadId] : [];
            
            await pool.query(query, params);
            
            console.log(`🔄 Reset missed follow-up flag${leadId ? ` for lead ${leadId}` : ' for all leads'}`);
            return true;
        } catch (error) {
            console.error('❌ Error resetting missed follow-up flag:', error);
            return false;
        }
    }
}

// Create singleton instance
const missedLeadService = new MissedLeadService();

module.exports = missedLeadService;
