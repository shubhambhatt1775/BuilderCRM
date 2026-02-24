const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const emailCronService = require('./services/emailCronService');

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
app.post('/api/fetch-emails', (req, res) => {
    const { fetchAllEmailsUltimate } = require('./ultimateEmailFetch');
    console.log('🔄 Manual email fetch requested...');
    fetchAllEmailsUltimate();
    res.json({ message: 'Email fetching started with direct credentials' });
});

/**
 * Dashboard refresh endpoint
 * - Used by frontend refresh button to fetch new emails
 * - Returns detailed processing results
 */
app.post('/api/refresh-emails', (req, res) => {
    const { fetchAllEmailsUltimate } = require('./ultimateEmailFetch');
    console.log('🔄 Dashboard refresh - fetching ALL emails...');
    fetchAllEmailsUltimate()
        .then(result => {
            res.json({ 
                message: 'Email refresh completed successfully',
                processed: result.processed,
                skipped: result.skipped,
                total: result.total
            });
        })
        .catch(error => {
            console.error('❌ Refresh error:', error);
            res.status(500).json({ error: error.message });
        });
});

// Start server and initialize email service
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start the automated email cron service
    emailCronService.start();
});

module.exports = app;
