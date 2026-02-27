const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const emailCronService = require('./services/emailCronService');
const missedLeadCronService = require('./services/missedLeadCronService');
const { fetchEmails } = require('./services/emailService');

console.log('🔧 Using email credentials from .env file');

/**
 * BuilderCRM Backend Server
 * 
 * Main Express server for the CRM application
 * - Handles API routing for users and leads
 * - Manages authentication middleware
 * - Starts automated email fetching service
 * - Provides comprehensive logging
 */
const app = express();

// Middleware configuration
app.use(cors()); // Enable CORS for frontend integration
app.use(express.json()); // Parse JSON request bodies

// Request logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api/users', userRoutes); // User authentication and management
app.use('/api/leads', leadRoutes); // Lead management operations

/**
 * Manual email fetch endpoint
 * - Triggers immediate email fetching from dashboard refresh button
 * - Returns processing statistics
 */
app.post('/api/fetch-emails', async (req, res) => {
    console.log('🔄 Manual email fetch requested...');
    try {
        await fetchEmails();
        res.json({ message: 'Email fetching started successfully' });
    } catch (error) {
        console.error('❌ Manual fetch error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Manual missed lead processing endpoint
 * - Triggers immediate missed lead detection and follow-up
 * - Returns processing statistics
 */
app.post('/api/process-missed-leads', async (req, res) => {
    try {
        console.log('🔄 Manual missed lead processing requested...');
        const results = await missedLeadCronService.runManually();
        res.json({
            message: 'Missed lead processing completed',
            results: results
        });
    } catch (error) {
        console.error('❌ Manual missed lead processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get missed lead statistics endpoint
 * - Returns current missed lead statistics
 */
app.get('/api/missed-leads-stats', async (req, res) => {
    try {
        const stats = await missedLeadCronService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('❌ Error getting missed lead stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Dashboard refresh endpoint
 * - Used by frontend refresh button to fetch new emails
 * - Returns detailed processing results
 */
app.post('/api/refresh-emails', async (req, res) => {
    console.log('🔄 Dashboard refresh - fetching emails...');
    try {
        const result = await fetchEmails();
        res.json({
            message: 'Email refresh completed successfully',
            processed: result.processed || 0,
            skipped: result.skipped || 0,
            total: result.total || 0
        });
    } catch (error) {
        console.error('❌ Refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server and initialize services
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start the automated email cron service
    emailCronService.start();
    // Start the automated missed lead cron service
    missedLeadCronService.start();
});

module.exports = app;
