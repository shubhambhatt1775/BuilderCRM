const axios = require('axios');
const pool = require('../config/db');
const whatsappLogger = require('./whatsappLogger');
require('dotenv').config();

/**
 * WhatsApp Service for Sending Greeting Messages
 * 
 * This service handles sending automated WhatsApp greeting messages
 * to new leads when they are created in the CRM system.
 */
class WhatsAppService {
    constructor() {
        this.apiEndpoint = 'https://www.vedikin.com/wa-schedule-message/schedule-message/';
        this.defaultGreeting = `Hello 👋
Welcome {{Client Name}}!
Our salesman will reach you soon!!

Thanks for reaching out. Our team will contact you shortly.`;
    }

    /**
     * Send WhatsApp greeting message to a lead
     * @param {string} phoneNumber - Phone number with country code
     * @param {string} clientName - Name of the client
     * @param {number} leadId - Lead ID for logging
     * @param {string} customMessage - Optional custom message template
     * @returns {Promise<Object>} Result object with success status and details
     */
    async sendGreeting(phoneNumber, clientName, leadId = null, customMessage = null) {
        try {
            // Validate phone number
            const cleanPhone = this.validateAndCleanPhone(phoneNumber);
            if (!cleanPhone) {
                const error = new Error('Invalid phone number format');
                await whatsappLogger.logError(phoneNumber, clientName, leadId, error);
                throw error;
            }

            // Prepare message template
            const messageTemplate = customMessage || this.defaultGreeting;
            const personalizedMessage = messageTemplate.replace('{{Client Name}}', clientName || 'Valued Customer');

            // Prepare API request
            const requestData = {
                phone_number: cleanPhone,
                message: personalizedMessage
            };

            console.log(`📱 Sending WhatsApp greeting to ${cleanPhone}`);

            // Make API call
            const response = await axios.post(this.apiEndpoint, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            });

            // Log success
            await whatsappLogger.logSuccess(cleanPhone, clientName, leadId, response.data);
            
            return {
                success: true,
                phoneNumber: cleanPhone,
                message: personalizedMessage,
                timestamp: new Date().toISOString(),
                apiResponse: response.data
            };

        } catch (error) {
            // Log error with detailed information
            await whatsappLogger.logError(phoneNumber, clientName, leadId, error, error.response?.data || null);
            
            return {
                success: false,
                phoneNumber: phoneNumber,
                error: error.message,
                timestamp: new Date().toISOString(),
                apiError: error.response?.data || null
            };
        }
    }

    /**
     * Validate and clean phone number
     * @param {string} phone - Phone number to validate
     * @returns {string|null} Cleaned phone number or null if invalid
     */
    validateAndCleanPhone(phone) {
        if (!phone) return null;

        // Remove all non-digit characters
        let cleanPhone = phone.replace(/\D/g, '');

        // Handle Indian phone numbers
        // If starts with 91 and has 12 digits, it's already formatted correctly
        if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
            return cleanPhone;
        }

        // If it's 10 digits, add 91 country code
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
            return cleanPhone;
        }

        // If it's 11 digits and starts with 0, remove 0 and add 91
        if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
            cleanPhone = '91' + cleanPhone.substring(1);
            return cleanPhone;
        }

        // If it has more than 12 digits, take the last 12 (in case of duplicates)
        if (cleanPhone.length > 12) {
            cleanPhone = cleanPhone.slice(-12);
            return cleanPhone;
        }

        // Validate final format (should be 12 digits starting with 91)
        if (!/^91\d{10}$/.test(cleanPhone)) {
            return null;
        }

        return cleanPhone;
    }

    /**
     * Check if WhatsApp greeting was already sent
     * @param {string} phoneNumber - Phone number to check
     * @returns {Promise<boolean>} True if greeting was already sent
     */
    async wasGreetingSent(phoneNumber) {
        try {
            const cleanPhone = this.validateAndCleanPhone(phoneNumber);
            if (!cleanPhone) return false;

            // Query database to check if greeting was sent
            const [rows] = await pool.query(
                'SELECT whatsapp_greeting_sent FROM leads WHERE phone = ? AND whatsapp_greeting_sent = TRUE',
                [cleanPhone]
            );

            return rows.length > 0;
        } catch (error) {
            console.error('Error checking WhatsApp greeting status:', error);
            return false; // Assume not sent on error to avoid missing greetings
        }
    }

    /**
     * Update lead record to mark WhatsApp greeting as sent
     * @param {number} leadId - ID of the lead
     * @returns {Promise<boolean>} True if update successful
     */
    async markGreetingAsSent(leadId) {
        try {
            await pool.query(
                'UPDATE leads SET whatsapp_greeting_sent = TRUE, whatsapp_greeting_sent_at = NOW() WHERE id = ?',
                [leadId]
            );

            console.log(`✅ Marked WhatsApp greeting as sent for lead ID: ${leadId}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to mark WhatsApp greeting as sent for lead ID ${leadId}:`, error);
            return false;
        }
    }

    /**
     * Log skipped WhatsApp message (no phone number)
     * @param {number} leadId - Lead ID
     * @param {string} clientName - Client name
     * @param {string} reason - Reason for skipping
     */
    async logSkippedMessage(leadId, clientName, reason) {
        await whatsappLogger.logSkipped(leadId, clientName, reason);
    }

    /**
     * Get WhatsApp statistics
     * @returns {Promise<Object>} WhatsApp messaging statistics
     */
    async getStats() {
        return await whatsappLogger.getStats();
    }

    /**
     * Get recent error logs for debugging
     * @param {number} limit - Number of recent logs to retrieve
     * @returns {Promise<Array>} Array of recent error logs
     */
    async getRecentErrors(limit = 10) {
        return await whatsappLogger.getRecentErrors(limit);
    }

    /**
     * Check if missed follow-up was already sent
     * @param {number} leadId - Lead ID to check
     * @returns {Promise<boolean>} True if missed follow-up was already sent
     */
    async wasMissedFollowupSent(leadId) {
        try {
            const [rows] = await pool.query(
                'SELECT missed_followup_sent FROM leads WHERE id = ? AND missed_followup_sent = TRUE',
                [leadId]
            );

            return rows.length > 0;
        } catch (error) {
            console.error('Error checking missed follow-up status:', error);
            return false; // Assume not sent on error to avoid missing follow-ups
        }
    }

    /**
     * Update lead record to mark missed follow-up as sent
     * @param {number} leadId - ID of the lead
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
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
