const pool = require('../config/db');
const whatsappService = require('../services/whatsappService');

exports.getAllLeads = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.*, 
            CASE 
                WHEN b.id IS NOT NULL THEN JSON_OBJECT(
                    'amount', b.amount,
                    'project', b.project,
                    'bookingDate', b.booking_date
                )
                ELSE NULL 
            END as booking_details
            FROM leads l
            LEFT JOIN bookings b ON l.id = b.lead_id
            ORDER BY l.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.assignLead = async (req, res) => {
    const { leadId, salesmanId } = req.body;
    try {
        await pool.query('UPDATE leads SET assigned_to = ?, status = ? WHERE id = ?', [salesmanId, 'Assigned', leadId]);
        res.json({ message: 'Lead assigned successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSalesmanLeads = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.*, 
            CASE 
                WHEN b.id IS NOT NULL THEN JSON_OBJECT(
                    'amount', b.amount,
                    'project', b.project,
                    'bookingDate', b.booking_date
                )
                ELSE NULL 
            END as booking_details
            FROM leads l
            LEFT JOIN bookings b ON l.id = b.lead_id
            WHERE l.assigned_to = ? 
            ORDER BY l.created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateLeadStatus = async (req, res) => {
    const { leadId, status, remarks, followupDate, bookingDetails, notInterestedMainReason, notInterestedReason } = req.body;
    const salesmanId = req.user.id;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update lead status
        if (status === 'Not Interested') {
            await connection.query('UPDATE leads SET status = ?, not_interested_main_reason = ?, not_interested_reason = ? WHERE id = ?',
                [status, notInterestedMainReason || null, notInterestedReason || null, leadId]);
        } else {
            await connection.query('UPDATE leads SET status = ?, not_interested_main_reason = NULL, not_interested_reason = NULL WHERE id = ?', [status, leadId]);
        }

        // 2. Mark all previous pending or missed followups for this lead as 'Completed'
        await connection.query('UPDATE followups SET status = ? WHERE lead_id = ? AND (status = ? OR status = ?)', ['Completed', leadId, 'Pending', 'Missed']);

        // 3. Handle specific status cases
        if (status === 'Follow-up') {
            await connection.query('INSERT INTO followups (lead_id, salesman_id, followup_date, remarks) VALUES (?, ?, ?, ?)',
                [leadId, salesmanId, followupDate, remarks]);
        }

        if (status === 'Deal Won') {
            const { amount, project, bookingDate } = bookingDetails;
            await connection.query('INSERT INTO bookings (lead_id, salesman_id, booking_date, amount, project) VALUES (?, ?, ?, ?, ?)',
                [leadId, salesmanId, bookingDate, amount, project]);
        }

        await connection.commit();
        res.json({ message: `Lead status updated to ${status}` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

exports.getTodayFollowups = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await pool.query(
            `SELECT f.*, l.sender_name, l.sender_email 
             FROM followups f 
             JOIN leads l ON f.lead_id = l.id 
             WHERE l.assigned_to = ? AND f.followup_date = ? AND f.status = 'Pending'`,
            [req.user.id, today]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAdminReports = async (req, res) => {
    try {
        // 1. Overall Stats
        const [overallStatus] = await pool.query(
            'SELECT status, COUNT(*) as count FROM leads GROUP BY status'
        );

        // 2. Salesman Performance
        const [salesmanPerf] = await pool.query(`
            SELECT 
                u.id, 
                u.name, 
                COUNT(l.id) as total_assigned,
                SUM(CASE WHEN l.status = 'Deal Won' THEN 1 ELSE 0 END) as deals_won,
                SUM(CASE WHEN l.status = 'Not Interested' THEN 1 ELSE 0 END) as deals_lost,
                IFNULL(SUM(b.amount), 0) as total_revenue
            FROM users u
            LEFT JOIN leads l ON u.id = l.assigned_to
            LEFT JOIN bookings b ON l.id = b.lead_id
            WHERE u.role = 'salesman'
            GROUP BY u.id
        `);

        // 3. Monthly Trend (Leads Won)
        const [monthlyTrend] = await pool.query(`
            SELECT 
                DATE_FORMAT(booking_date, '%Y-%m') as month,
                SUM(amount) as revenue,
                COUNT(*) as deals
            FROM bookings
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
        `);

        res.json({
            overallStatus,
            salesmanPerf,
            monthlyTrend
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get follow-up history for a specific lead
exports.getLeadFollowupHistory = async (req, res) => {
    const { leadId } = req.params;
    try {
        // Get lead details
        const [leadDetails] = await pool.query(`
            SELECT 
                l.*,
                u.name as assigned_salesman,
                u.email as salesman_email,
                u.role as salesman_role,
                CASE 
                    WHEN b.id IS NOT NULL THEN JSON_OBJECT(
                        'amount', b.amount,
                        'project', b.project,
                        'bookingDate', b.booking_date
                    )
                    ELSE NULL 
                END as booking_details
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN bookings b ON l.id = b.lead_id
            WHERE l.id = ?
        `, [leadId]);

        // Get follow-up history
        const [followupHistory] = await pool.query(`
            SELECT 
                f.id,
                f.followup_date,
                f.remarks,
                f.status,
                f.completion_date,
                f.completion_notes,
                f.created_at,
                f.updated_at,
                u.name as salesman_name,
                u.email as salesman_email
            FROM followups f
            JOIN users u ON f.salesman_id = u.id
            WHERE f.lead_id = ?
            ORDER BY f.followup_date ASC, f.created_at ASC
        `, [leadId]);

        // Calculate summary
        const summary = {
            totalFollowups: followupHistory.length,
            pendingFollowups: followupHistory.filter(f => f.status === 'Pending').length,
            completedFollowups: followupHistory.filter(f => f.status === 'Completed').length,
            missedFollowups: followupHistory.filter(f => f.status === 'Missed').length
        };

        res.json({
            leadDetails: leadDetails[0] || null,
            followupHistory,
            summary
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all follow-up history for salesman (their assigned leads)
exports.getSalesmanFollowupHistory = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                f.id,
                f.lead_id,
                f.followup_date,
                f.remarks,
                f.status,
                f.completion_date,
                f.completion_notes,
                f.created_at,
                f.updated_at,
                l.sender_name,
                l.sender_email,
                l.subject,
                l.status as lead_status
            FROM followups f
            JOIN leads l ON f.lead_id = l.id
            WHERE f.salesman_id = ?
            ORDER BY f.followup_date DESC, f.created_at DESC
        `, [req.user.id]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get KPI data for a specific salesman (admin endpoint)
exports.getSalesmanKPIById = async (req, res) => {
    try {
        const { salesmanId } = req.params;

        console.log('🔍 ADMIN KPI REQUEST - Salesman ID:', salesmanId);

        // Get ALL leads for this salesman with detailed info
        const [allLeads] = await pool.query(`
            SELECT id, sender_name, status, assigned_to, created_at
            FROM leads 
            WHERE assigned_to = ?
            ORDER BY created_at DESC
        `, [salesmanId]);

        console.log('🔍 ADMIN KPI - Found leads:', allLeads.length);

        // Count by status manually to be sure
        const statusCounts = {
            'New': 0,
            'Assigned': 0,
            'Follow-up': 0,
            'Deal Won': 0,
            'Not Interested': 0,
            'WON': 0,
            'Won': 0,
            'DEAL WON': 0
        };

        allLeads.forEach(lead => {
            if (statusCounts.hasOwnProperty(lead.status)) {
                statusCounts[lead.status]++;
            }
        });

        // Calculate total and won deals
        const totalAssigned = allLeads.length;
        const wonDeals = statusCounts['Deal Won'] + statusCounts['WON'] + statusCounts['Won'] + statusCounts['DEAL WON'];

        console.log('🔍 ADMIN KPI - Total:', totalAssigned, 'Won:', wonDeals);

        // NEW APPROACH: Check each lead's latest follow-up date
        let missedCount = 0;
        const today = new Date().toISOString().split('T')[0];

        // Check each lead individually
        for (const lead of allLeads) {
            // Skip leads that are already won or not interested
            if (lead.status === 'Deal Won' || lead.status === 'Not Interested' ||
                lead.status === 'Won' || lead.status === 'WON' || lead.status === 'DEAL WON') {
                continue;
            }

            // Get the latest follow-up for this lead
            const [latestFollowup] = await pool.query(`
                SELECT followup_date, status
                FROM followups 
                WHERE lead_id = ? 
                ORDER BY followup_date DESC 
                LIMIT 1
            `, [lead.id]);

            if (latestFollowup.length > 0) {
                const followup = latestFollowup[0];
                const followupDate = new Date(followup.followup_date).toISOString().split('T')[0];

                // Check if follow-up date is past (overdue) AND not completed
                if (followupDate < today && (followup.status === 'Pending' || followup.status === 'Missed')) {
                    missedCount++;
                }
            }
        }

        const totalRealMissedCount = missedCount;

        console.log('🔍 ADMIN KPI - Missed:', totalRealMissedCount);

        // Calculate success rate
        const successRate = totalAssigned > 0 ? ((wonDeals / totalAssigned) * 100).toFixed(1) : '0.0';

        const result = {
            total: totalAssigned,
            won: wonDeals,
            missed: totalRealMissedCount,
            successRate: parseFloat(successRate)
        };

        console.log('🔍 ADMIN KPI - FINAL RESULT:', result);

        res.json(result);
    } catch (err) {
        console.error('❌ ADMIN KPI CALCULATION ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get total missed leads across all salesmen (for admin dashboard)
exports.getAllSalesmenMissedCount = async (req, res) => {
    try {
        console.log('🔍 GETTING TOTAL MISSED LEADS FOR ALL SALESMEN');

        const today = new Date().toISOString().split('T')[0];

        // Get all salesmen
        const [salesmen] = await pool.query(`
            SELECT id, name, email FROM users WHERE role = 'salesman'
        `);

        let totalMissedCount = 0;

        // Check each salesman's leads
        for (const salesman of salesmen) {
            // Get all leads for this salesman
            const [leads] = await pool.query(`
                SELECT id, sender_name, status, assigned_to, created_at
                FROM leads 
                WHERE assigned_to = ?
                ORDER BY created_at DESC
            `, [salesman.id]);

            // Check each lead individually
            for (const lead of leads) {
                // Skip leads that are already won or not interested
                if (lead.status === 'Deal Won' || lead.status === 'Not Interested' ||
                    lead.status === 'Won' || lead.status === 'WON' || lead.status === 'DEAL WON') {
                    continue;
                }

                // Get the latest follow-up for this lead
                const [latestFollowup] = await pool.query(`
                    SELECT followup_date, status
                    FROM followups 
                    WHERE lead_id = ? 
                    ORDER BY followup_date DESC 
                    LIMIT 1
                `, [lead.id]);

                if (latestFollowup.length > 0) {
                    const followup = latestFollowup[0];
                    const followupDate = new Date(followup.followup_date).toISOString().split('T')[0];

                    // Check if follow-up date is past (overdue) AND not completed
                    if (followupDate < today && (followup.status === 'Pending' || followup.status === 'Missed')) {
                        totalMissedCount++;
                    }
                }
            }
        }

        console.log('🔍 TOTAL MISSED LEADS ACROSS ALL SALESMEN:', totalMissedCount);

        res.json({
            totalMissed: totalMissedCount
        });
    } catch (err) {
        console.error('❌ ERROR GETTING TOTAL MISSED LEADS:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get KPI data for a specific salesman
exports.getSalesmanKPI = async (req, res) => {
    try {
        const salesmanId = req.user.id;

        // Get ALL leads for this salesman with detailed info
        const [allLeads] = await pool.query(`
            SELECT id, sender_name, status, assigned_to, created_at
            FROM leads 
            WHERE assigned_to = ?
            ORDER BY created_at DESC
        `, [salesmanId]);

        // Count by status manually to be sure
        const statusCounts = {
            'New': 0,
            'Assigned': 0,
            'Follow-up': 0,
            'Deal Won': 0,
            'Not Interested': 0,
            'WON': 0,
            'Won': 0,
            'DEAL WON': 0
        };

        allLeads.forEach(lead => {
            if (statusCounts.hasOwnProperty(lead.status)) {
                statusCounts[lead.status]++;
            }
        });

        // Calculate total and won deals
        const totalAssigned = allLeads.length;
        const wonDeals = statusCounts['Deal Won'] + statusCounts['WON'] + statusCounts['Won'] + statusCounts['DEAL WON'];

        // NEW APPROACH: Check each lead's latest follow-up date
        let missedCount = 0;
        const today = new Date().toISOString().split('T')[0];

        // Check each lead individually
        for (const lead of allLeads) {
            // Skip leads that are already won or not interested
            if (lead.status === 'Deal Won' || lead.status === 'Not Interested' ||
                lead.status === 'Won' || lead.status === 'WON' || lead.status === 'DEAL WON') {
                continue;
            }

            // Get the latest follow-up for this lead
            const [latestFollowup] = await pool.query(`
                SELECT followup_date, status
                FROM followups 
                WHERE lead_id = ? 
                ORDER BY followup_date DESC 
                LIMIT 1
            `, [lead.id]);

            if (latestFollowup.length > 0) {
                const followup = latestFollowup[0];
                const followupDate = new Date(followup.followup_date).toISOString().split('T')[0];

                // Check if follow-up date is past (overdue) AND not completed
                if (followupDate < today && (followup.status === 'Pending' || followup.status === 'Missed')) {
                    missedCount++;
                }
            }
        }

        const totalRealMissedCount = missedCount;

        // Calculate success rate
        const successRate = totalAssigned > 0 ? ((wonDeals / totalAssigned) * 100).toFixed(1) : '0.0';

        const result = {
            total: totalAssigned,
            won: wonDeals,
            missed: totalRealMissedCount,
            successRate: parseFloat(successRate)
        };

        res.json(result);
    } catch (err) {
        console.error('KPI CALCULATION ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get all follow-up history for admin (all salesmen)
exports.getAllFollowupHistory = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                f.id,
                f.lead_id,
                f.followup_date,
                f.remarks,
                f.status,
                f.completion_date,
                f.completion_notes,
                f.created_at,
                f.updated_at,
                l.sender_name,
                l.sender_email,
                l.subject,
                l.status as lead_status,
                u.name as salesman_name,
                u.email as salesman_email
            FROM followups f
            JOIN leads l ON f.lead_id = l.id
            JOIN users u ON f.salesman_id = u.id
            ORDER BY f.followup_date DESC, f.created_at DESC
        `);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update follow-up status (mark as completed/missed)
exports.updateFollowupStatus = async (req, res) => {
    const { followupId, status, completionNotes } = req.body;
    const salesmanId = req.user.id;

    try {
        await pool.query(
            'UPDATE followups SET status = ?, completion_date = NOW(), completion_notes = ?, updated_at = NOW() WHERE id = ? AND salesman_id = ?',
            [status, completionNotes, followupId, salesmanId]
        );

        res.json({ message: `Follow-up marked as ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get follow-up statistics
exports.getFollowupStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let whereClause = userRole === 'admin' ? '' : 'WHERE f.salesman_id = ?';
        let params = userRole === 'admin' ? [] : [userId];

        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_followups,
                SUM(CASE WHEN f.status = 'Pending' THEN 1 ELSE 0 END) as pending_followups,
                SUM(CASE WHEN f.status = 'Completed' THEN 1 ELSE 0 END) as completed_followups,
                SUM(CASE WHEN f.status = 'Missed' THEN 1 ELSE 0 END) as missed_followups,
                SUM(CASE WHEN f.followup_date = CURDATE() AND f.status = 'Pending' THEN 1 ELSE 0 END) as today_followups,
                SUM(CASE WHEN f.followup_date < CURDATE() AND f.status = 'Pending' THEN 1 ELSE 0 END) as overdue_followups
            FROM followups f
            ${whereClause}
        `, params);

        res.json(stats[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lead Tracking for Admin - Get comprehensive lead history
exports.getAllLeadTracking = async (req, res) => {
    try {
        const [leads] = await pool.query(`
            SELECT 
                l.id,
                l.sender_name,
                l.sender_email,
                l.subject,
                l.body,
                l.status as current_status,
                l.assigned_to,
                l.created_at as lead_created,
                u.name as assigned_salesman,
                u.email as salesman_email,
                COUNT(f.id) as total_followups,
                SUM(CASE WHEN f.status = 'Pending' THEN 1 ELSE 0 END) as pending_followups,
                SUM(CASE WHEN f.status = 'Completed' THEN 1 ELSE 0 END) as completed_followups,
                SUM(CASE WHEN f.status = 'Missed' THEN 1 ELSE 0 END) as missed_followups,
                MAX(f.followup_date) as last_followup_date,
                CASE 
                    WHEN b.id IS NOT NULL THEN 'Deal Won'
                    WHEN l.status = 'Not Interested' THEN 'Lost'
                    WHEN COUNT(f.id) = 0 THEN 'New'
                    WHEN SUM(CASE WHEN f.status = 'Pending' THEN 1 ELSE 0 END) > 0 THEN 'Active'
                    ELSE 'Inactive'
                END as pipeline_status
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN followups f ON l.id = f.lead_id
            LEFT JOIN bookings b ON l.id = b.lead_id
            GROUP BY l.id, u.id, b.id
            ORDER BY l.created_at DESC
        `);

        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get detailed history for a specific lead (Admin view)
exports.getLeadDetailedHistory = async (req, res) => {
    const { leadId } = req.params;
    try {
        // Get lead details
        const [leadDetails] = await pool.query(`
            SELECT 
                l.*,
                u.name as assigned_salesman,
                u.email as salesman_email,
                u.role as salesman_role,
                CASE 
                    WHEN b.id IS NOT NULL THEN JSON_OBJECT(
                        'amount', b.amount,
                        'project', b.project,
                        'bookingDate', b.booking_date
                    )
                    ELSE NULL 
                END as booking_details
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN bookings b ON l.id = b.lead_id
            WHERE l.id = ?
        `, [leadId]);

        // Get follow-up history
        const [followupHistory] = await pool.query(`
            SELECT 
                f.id,
                f.followup_date,
                f.remarks,
                f.status,
                f.completion_date,
                f.completion_notes,
                f.created_at,
                f.updated_at,
                u.name as salesman_name,
                u.email as salesman_email
            FROM followups f
            JOIN users u ON f.salesman_id = u.id
            WHERE f.lead_id = ?
            ORDER BY f.followup_date DESC, f.created_at DESC
        `, [leadId]);

        // Get booking details if any
        const [bookingDetails] = await pool.query(`
            SELECT 
                b.*,
                u.name as booking_salesman
            FROM bookings b
            JOIN users u ON b.salesman_id = u.id
            WHERE b.lead_id = ?
            ORDER BY b.created_at DESC
        `, [leadId]);

        // Get timeline of all activities
        const [timeline] = await pool.query(`
            SELECT 
                'lead_created' as activity_type,
                l.created_at as timestamp,
                CONCAT('Lead created by ', l.sender_name) as description,
                NULL as details
            FROM leads l
            WHERE l.id = ?
            
            UNION ALL
            
            SELECT 
                'followup_created' as activity_type,
                f.created_at as timestamp,
                CONCAT('Follow-up scheduled by ', u.name) as description,
                JSON_OBJECT('followup_date', f.followup_date, 'remarks', f.remarks) as details
            FROM followups f
            JOIN users u ON f.salesman_id = u.id
            WHERE f.lead_id = ?
            
            UNION ALL
            
            SELECT 
                'followup_completed' as activity_type,
                f.completion_date as timestamp,
                CONCAT('Follow-up marked as ', f.status, ' by ', u.name) as description,
                JSON_OBJECT('completion_notes', f.completion_notes) as details
            FROM followups f
            JOIN users u ON f.salesman_id = u.id
            WHERE f.lead_id = ? AND f.completion_date IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'status_changed' as activity_type,
                l.updated_at as timestamp,
                CONCAT('Status changed to ', l.status) as description,
                NULL as details
            FROM leads l
            WHERE l.id = ? AND l.updated_at IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'booking_created' as activity_type,
                b.created_at as timestamp,
                CONCAT('Deal booked by ', u.name, ' - ', b.project) as description,
                JSON_OBJECT('amount', b.amount, 'booking_date', b.booking_date) as details
            FROM bookings b
            JOIN users u ON b.salesman_id = u.id
            WHERE b.lead_id = ?
            
            ORDER BY timestamp DESC
        `, [leadId, leadId, leadId, leadId, leadId]);

        res.json({
            leadDetails: leadDetails[0] || null,
            followupHistory,
            bookingDetails,
            timeline,
            summary: {
                totalFollowups: followupHistory.length,
                pendingFollowups: followupHistory.filter(f => f.status === 'Pending').length,
                completedFollowups: followupHistory.filter(f => f.status === 'Completed').length,
                missedFollowups: followupHistory.filter(f => f.status === 'Missed').length,
                hasBooking: bookingDetails.length > 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get lead tracking statistics for admin dashboard
exports.getLeadTrackingStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_leads,
                SUM(CASE WHEN l.status = 'New' THEN 1 ELSE 0 END) as new_leads,
                SUM(CASE WHEN l.status = 'Assigned' THEN 1 ELSE 0 END) as assigned_leads,
                SUM(CASE WHEN l.status = 'Follow-up' THEN 1 ELSE 0 END) as followup_leads,
                SUM(CASE WHEN l.status = 'Deal Won' THEN 1 ELSE 0 END) as deals_won,
                SUM(CASE WHEN l.status = 'Not Interested' THEN 1 ELSE 0 END) as lost_leads,
                SUM(CASE WHEN l.assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned_leads,
                COUNT(DISTINCT l.assigned_to) as active_salesmen,
                IFNULL(SUM(b.amount), 0) as total_revenue,
                COUNT(DISTINCT b.id) as total_bookings
            FROM leads l
            LEFT JOIN bookings b ON l.id = b.lead_id
        `);

        // Get pipeline distribution
        const [pipeline] = await pool.query(`
            SELECT 
                pipeline_stage,
                COUNT(*) as count
            FROM (
                SELECT 
                    l.id,
                    CASE 
                        WHEN b.id IS NOT NULL THEN 'Deal Won'
                        WHEN l.status = 'Not Interested' THEN 'Lost'
                        WHEN COUNT(f.id) = 0 THEN 'New'
                        WHEN SUM(CASE WHEN f.status = 'Pending' THEN 1 ELSE 0 END) > 0 THEN 'Active'
                        ELSE 'Inactive'
                    END as pipeline_stage
                FROM leads l
                LEFT JOIN users u ON l.assigned_to = u.id
                LEFT JOIN followups f ON l.id = f.lead_id
                LEFT JOIN bookings b ON l.id = b.lead_id
                GROUP BY l.id, b.id
            ) as pipeline_data
            GROUP BY pipeline_stage
        `);

        // Get monthly trends
        const [monthlyTrends] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as leads_created,
                SUM(CASE WHEN status = 'Deal Won' THEN 1 ELSE 0 END) as deals_won,
                IFNULL(SUM(CASE WHEN status = 'Deal Won' THEN (
                    SELECT amount FROM bookings WHERE lead_id = l.id LIMIT 1
                ) END), 0) as revenue
            FROM leads l
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
        `);

        res.json({
            overview: stats[0],
            pipeline,
            monthlyTrends
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get comprehensive timeline for history tracking
exports.getHistoryTimeline = async (req, res) => {
    try {
        const { limit = 50, offset = 0, activityType = 'all' } = req.query;

        let whereClause = '';
        let params = [];

        if (activityType !== 'all') {
            whereClause = 'WHERE activity_type = ?';
            params.push(activityType);
        }

        const [timeline] = await pool.query(`
            SELECT 
                activity_type,
                timestamp,
                description,
                details,
                lead_id,
                salesman_name,
                salesman_email,
                CASE 
                    WHEN activity_type = 'lead_created' THEN 'blue'
                    WHEN activity_type = 'followup_created' THEN 'amber'
                    WHEN activity_type = 'followup_completed' THEN 'green'
                    WHEN activity_type = 'status_changed' THEN 'purple'
                    WHEN activity_type = 'booking_created' THEN 'emerald'
                    WHEN activity_type = 'lead_assigned' THEN 'indigo'
                    ELSE 'gray'
                END as color
            FROM (
                SELECT 
                    'lead_created' as activity_type,
                    l.created_at as timestamp,
                    CONCAT('New lead from ', l.sender_name, ' (', l.sender_email, ')') as description,
                    JSON_OBJECT('subject', l.subject, 'phone', l.phone, 'source', l.source) as details,
                    l.id as lead_id,
                    NULL as salesman_name,
                    NULL as salesman_email
                FROM leads l
                
                UNION ALL
                
                SELECT 
                    'lead_assigned' as activity_type,
                    l.updated_at as timestamp,
                    CONCAT(l.sender_name, ' assigned to ', u.name) as description,
                    JSON_OBJECT('lead_email', l.sender_email, 'salesman_email', u.email) as details,
                    l.id as lead_id,
                    u.name as salesman_name,
                    u.email as salesman_email
                FROM leads l
                JOIN users u ON l.assigned_to = u.id
                WHERE l.assigned_to IS NOT NULL AND l.updated_at IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    'followup_created' as activity_type,
                    f.created_at as timestamp,
                    CONCAT('Follow-up scheduled for ', l.sender_name, ' by ', u.name) as description,
                    JSON_OBJECT('followup_date', f.followup_date, 'remarks', f.remarks, 'lead_email', l.sender_email) as details,
                    f.lead_id,
                    u.name as salesman_name,
                    u.email as salesman_email
                FROM followups f
                JOIN users u ON f.salesman_id = u.id
                JOIN leads l ON f.lead_id = l.id
                
                UNION ALL
                
                SELECT 
                    'followup_completed' as activity_type,
                    f.completion_date as timestamp,
                    CONCAT('Follow-up marked as ', f.status, ' for ', l.sender_name, ' by ', u.name) as description,
                    JSON_OBJECT('completion_notes', f.completion_notes, 'lead_email', l.sender_email) as details,
                    f.lead_id,
                    u.name as salesman_name,
                    u.email as salesman_email
                FROM followups f
                JOIN users u ON f.salesman_id = u.id
                JOIN leads l ON f.lead_id = l.id
                WHERE f.completion_date IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    'status_changed' as activity_type,
                    l.updated_at as timestamp,
                    CONCAT('Status changed to ', l.status, ' for ', l.sender_name) as description,
                    JSON_OBJECT('lead_email', l.sender_email, 'previous_status', l.status) as details,
                    l.id as lead_id,
                    u.name as salesman_name,
                    u.email as salesman_email
                FROM leads l
                LEFT JOIN users u ON l.assigned_to = u.id
                WHERE l.updated_at IS NOT NULL AND l.created_at != l.updated_at
                
                UNION ALL
                
                SELECT 
                    'booking_created' as activity_type,
                    b.created_at as timestamp,
                    CONCAT('Deal closed! ', l.sender_name, ' booked ', b.project, ' with ', u.name) as description,
                    JSON_OBJECT('amount', b.amount, 'booking_date', b.booking_date, 'lead_email', l.sender_email, 'project', b.project) as details,
                    b.lead_id,
                    u.name as salesman_name,
                    u.email as salesman_email
                FROM bookings b
                JOIN users u ON b.salesman_id = u.id
                JOIN leads l ON b.lead_id = l.id
            ) as all_activities
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Get activity counts for stats
        const [activityCounts] = await pool.query(`
            SELECT 
                activity_type,
                COUNT(*) as count
            FROM (
                SELECT 'lead_created' as activity_type FROM leads
                UNION ALL
                SELECT 'followup_created' FROM followups
                UNION ALL
                SELECT 'followup_completed' FROM followups WHERE completion_date IS NOT NULL
                UNION ALL
                SELECT 'booking_created' FROM bookings
                UNION ALL
                SELECT 'lead_assigned' FROM leads WHERE assigned_to IS NOT NULL
            ) as activities
            GROUP BY activity_type
        `);

        res.json({
            timeline,
            stats: activityCounts,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: timeline.length === parseInt(limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get recent activities for dashboard
exports.getRecentActivities = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const [activities] = await pool.query(`
            SELECT 
                activity_type,
                timestamp,
                description,
                details,
                lead_id,
                salesman_name,
                CASE 
                    WHEN activity_type = 'lead_created' THEN 'blue'
                    WHEN activity_type = 'followup_created' THEN 'amber'
                    WHEN activity_type = 'followup_completed' THEN 'green'
                    WHEN activity_type = 'status_changed' THEN 'purple'
                    WHEN activity_type = 'booking_created' THEN 'emerald'
                    WHEN activity_type = 'lead_assigned' THEN 'indigo'
                    ELSE 'gray'
                END as color,
                TIMESTAMPDIFF(HOUR, timestamp, NOW()) as hours_ago,
                CASE 
                    WHEN TIMESTAMPDIFF(HOUR, timestamp, NOW()) < 1 THEN 'Just now'
                    WHEN TIMESTAMPDIFF(HOUR, timestamp, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, timestamp, NOW()), ' hours ago')
                    WHEN TIMESTAMPDIFF(DAY, timestamp, NOW()) < 7 THEN CONCAT(TIMESTAMPDIFF(DAY, timestamp, NOW()), ' days ago')
                    ELSE DATE_FORMAT(timestamp, '%b %d, %Y')
                END as time_ago
            FROM (
                SELECT 
                    'lead_created' as activity_type,
                    l.created_at as timestamp,
                    CONCAT('New lead from ', l.sender_name) as description,
                    JSON_OBJECT('subject', l.subject, 'email', l.sender_email) as details,
                    l.id as lead_id,
                    NULL as salesman_name
                FROM leads l
                
                UNION ALL
                
                SELECT 
                    'lead_assigned' as activity_type,
                    l.updated_at as timestamp,
                    CONCAT(l.sender_name, ' assigned to ', u.name) as description,
                    JSON_OBJECT('email', l.sender_email, 'salesman', u.name) as details,
                    l.id as lead_id,
                    u.name as salesman_name
                FROM leads l
                JOIN users u ON l.assigned_to = u.id
                WHERE l.assigned_to IS NOT NULL AND l.updated_at IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    'followup_created' as activity_type,
                    f.created_at as timestamp,
                    CONCAT('Follow-up scheduled for ', l.sender_name) as description,
                    JSON_OBJECT('salesman', u.name, 'date', f.followup_date) as details,
                    f.lead_id,
                    u.name as salesman_name
                FROM followups f
                JOIN users u ON f.salesman_id = u.id
                JOIN leads l ON f.lead_id = l.id
                
                UNION ALL
                
                SELECT 
                    'booking_created' as activity_type,
                    b.created_at as timestamp,
                    CONCAT('Deal closed! ', l.sender_name, ' - ', b.project) as description,
                    JSON_OBJECT('amount', b.amount, 'salesman', u.name) as details,
                    b.lead_id,
                    u.name as salesman_name
                FROM bookings b
                JOIN users u ON b.salesman_id = u.id
                JOIN leads l ON b.lead_id = l.id
            ) as recent_activities
            ORDER BY timestamp DESC
            LIMIT ?
        `, [parseInt(limit)]);

        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Check and update missed follow-ups
exports.checkAndUpdateMissedFollowups = async (req, res) => {
    try {
        const connection = await pool.getConnection();

        await connection.beginTransaction();

        // Update all pending follow-ups where due date has passed
        const [result] = await connection.query(`
            UPDATE followups 
            SET status = 'Missed', 
                completion_date = NOW(), 
                completion_notes = 'Automatically marked as missed - due date passed',
                updated_at = NOW()
            WHERE status = 'Pending' 
            AND followup_date < CURDATE()
        `);

        await connection.commit();
        connection.release();

        res.json({
            message: 'Missed follow-ups updated successfully',
            updatedCount: result.affectedRows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all leads with follow-up status and their complete follow-up history
exports.getAllFollowupStatusLeads = async (req, res) => {
    try {
        // Get all leads that are currently in "Follow-up" status
        const [leads] = await pool.query(`
            SELECT 
                l.id,
                l.sender_name,
                l.sender_email,
                l.phone,
                l.subject,
                l.body,
                l.status,
                l.assigned_to,
                l.created_at as lead_created,
                u.name as assigned_salesman,
                u.email as salesman_email,
                COUNT(f.id) as total_followups,
                SUM(CASE WHEN f.status = 'Pending' THEN 1 ELSE 0 END) as pending_followups,
                SUM(CASE WHEN f.status = 'Completed' THEN 1 ELSE 0 END) as completed_followups,
                SUM(CASE WHEN f.status = 'Missed' THEN 1 ELSE 0 END) as missed_followups,
                MAX(f.followup_date) as next_followup_date,
                MIN(CASE WHEN f.status = 'Pending' AND f.followup_date >= CURDATE() THEN f.followup_date END) as upcoming_followup
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN followups f ON l.id = f.lead_id
            WHERE l.status = 'Follow-up'
            GROUP BY l.id, u.id
            ORDER BY l.created_at DESC
        `);

        // For each lead, get detailed follow-up history
        const leadsWithHistory = await Promise.all(
            leads.map(async (lead) => {
                const [followupHistory] = await pool.query(`
                    SELECT 
                        f.id,
                        f.followup_date,
                        f.remarks,
                        f.status,
                        f.completion_date,
                        f.completion_notes,
                        f.created_at,
                        f.updated_at,
                        u.name as salesman_name,
                        u.email as salesman_email,
                        CASE 
                            WHEN f.status = 'Pending' AND f.followup_date < CURDATE() THEN 'overdue'
                            WHEN f.status = 'Pending' AND f.followup_date = CURDATE() THEN 'today'
                            WHEN f.status = 'Pending' AND f.followup_date > CURDATE() THEN 'upcoming'
                            WHEN f.status = 'Completed' THEN 'completed'
                            WHEN f.status = 'Missed' THEN 'missed'
                            ELSE f.status
                        END as urgency_status
                    FROM followups f
                    JOIN users u ON f.salesman_id = u.id
                    WHERE f.lead_id = ?
                    ORDER BY f.followup_date ASC, f.created_at ASC
                `, [lead.id]);

                return {
                    ...lead,
                    followupHistory,
                    statusSummary: {
                        total: lead.total_followups || 0,
                        pending: lead.pending_followups || 0,
                        completed: lead.completed_followups || 0,
                        missed: lead.missed_followups || 0,
                        nextAction: lead.upcoming_followup || 'No scheduled follow-up'
                    }
                };
            })
        );

        // Remove duplicates based on lead ID
        const uniqueLeads = leadsWithHistory.filter((lead, index, self) =>
            self.findIndex(l => l.id === lead.id) === index
        );

        // Get overall statistics
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_followup_leads,
                SUM(CASE WHEN l.assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned_followup_leads,
                SUM(CASE WHEN EXISTS (
                    SELECT 1 FROM followups f 
                    WHERE f.lead_id = l.id AND (f.status = 'Pending' AND f.followup_date < CURDATE() OR f.status = 'Missed')
                ) THEN 1 ELSE 0 END) as overdue_followup_leads,
                SUM(CASE WHEN EXISTS (
                    SELECT 1 FROM followups f 
                    WHERE f.lead_id = l.id AND f.status = 'Pending' AND f.followup_date = CURDATE()
                ) THEN 1 ELSE 0 END) as today_followup_leads,
                COUNT(DISTINCT l.assigned_to) as active_salesmen
            FROM leads l
            WHERE l.status = 'Follow-up'
        `);

        // Calculate correct summary from unique leads
        const summary = {
            totalLeads: uniqueLeads.length,
            totalFollowups: uniqueLeads.reduce((acc, lead) => acc + parseInt(lead.total_followups || 0), 0),
            pendingFollowups: uniqueLeads.reduce((acc, lead) => acc + parseInt(lead.pending_followups || 0), 0),
            overdueFollowups: uniqueLeads.filter(lead =>
                lead.followupHistory.some(f => f.urgency_status === 'overdue' || f.urgency_status === 'missed')
            ).length
        };

        res.json({
            leads: uniqueLeads,
            stats: stats[0],
            summary: summary
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get leads for a specific salesman (admin only)
exports.getSalesmanLeadsById = async (req, res) => {
    const { salesmanId } = req.params;
    try {
        const [leads] = await pool.query(`
            SELECT l.*, u.name as assigned_salesman, u.email as salesman_email,
            CASE 
                WHEN b.id IS NOT NULL THEN JSON_OBJECT(
                    'amount', b.amount,
                    'project', b.project,
                    'bookingDate', b.booking_date
                )
                ELSE NULL 
            END as booking_details
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN bookings b ON l.id = b.lead_id
            WHERE l.assigned_to = ?
            ORDER BY l.created_at DESC
        `, [salesmanId]);

        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get today's follow-ups for a specific salesman (admin only)
exports.getTodayFollowupsById = async (req, res) => {
    const { salesmanId } = req.params;
    try {
        const [followups] = await pool.query(`
            SELECT 
                f.*,
                l.sender_name,
                l.sender_email,
                l.phone,
                l.subject,
                l.body,
                u.name as salesman_name
            FROM followups f
            JOIN leads l ON f.lead_id = l.id
            LEFT JOIN users u ON f.salesman_id = u.id
            WHERE f.salesman_id = ? 
            AND f.followup_date = CURDATE()
            AND f.status = 'Pending'
            ORDER BY f.followup_date ASC
        `, [salesmanId]);

        res.json(followups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get follow-up history for a specific salesman (admin only)
exports.getSalesmanFollowupHistoryById = async (req, res) => {
    const { salesmanId } = req.params;
    try {
        const [followups] = await pool.query(`
            SELECT 
                f.*,
                l.sender_name,
                l.sender_email,
                l.phone,
                l.subject,
                l.body,
                u.name as salesman_name
            FROM followups f
            JOIN leads l ON f.lead_id = l.id
            LEFT JOIN users u ON f.salesman_id = u.id
            WHERE f.salesman_id = ?
            ORDER BY f.followup_date DESC, f.created_at DESC
        `, [salesmanId]);

        res.json(followups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// WhatsApp Management Endpoints

// Send WhatsApp greeting manually for a lead
exports.sendWhatsAppGreeting = async (req, res) => {
    const { leadId } = req.params;
    try {
        // Get lead details
        const [lead] = await pool.query(
            'SELECT id, sender_name, phone, subject, body, whatsapp_greeting_sent FROM leads WHERE id = ?',
            [leadId]
        );

        if (lead.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const leadData = lead[0];

        // Check if greeting already sent
        if (leadData.whatsapp_greeting_sent) {
            return res.status(400).json({ error: 'WhatsApp greeting already sent for this lead' });
        }

        // Check if phone number is available
        if (!leadData.phone || leadData.phone.length < 10) {
            return res.status(400).json({ error: 'No valid phone number available for this lead' });
        }

        // Create personalized greeting message from email content
        let greetingMessage = `Hello 👋\nWelcome ${leadData.sender_name}!\n`;

        // Add subject if available
        if (leadData.subject && leadData.subject.trim()) {
            greetingMessage += `Regarding: ${leadData.subject}\n\n`;
        }

        // Add relevant part of email body (first 200 characters)
        if (leadData.body && leadData.body.trim()) {
            const cleanBody = leadData.body.replace(/\n+/g, ' ').trim();
            const shortBody = cleanBody.length > 200 ? cleanBody.substring(0, 200) + '...' : cleanBody;
            greetingMessage += `Message: ${shortBody}\n\n`;
        }

        greetingMessage += `Our salesman will reach you soon!!\n\nThanks for reaching out. Our team will contact you shortly.`;

        // Send WhatsApp greeting
        const result = await whatsappService.sendGreeting(
            leadData.phone,
            leadData.sender_name,
            leadData.id,
            greetingMessage
        );

        if (result.success) {
            // Mark as sent in database
            await whatsappService.markGreetingAsSent(leadId);
            res.json({
                message: 'WhatsApp greeting sent successfully',
                result: result
            });
        } else {
            res.status(500).json({
                error: 'Failed to send WhatsApp greeting',
                details: result.error
            });
        }
    } catch (err) {
        console.error('Error sending WhatsApp greeting:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get WhatsApp statistics
exports.getWhatsAppStats = async (req, res) => {
    try {
        const stats = await whatsappService.getStats();

        // Get additional database statistics
        const [dbStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_leads,
                SUM(CASE WHEN whatsapp_greeting_sent = TRUE THEN 1 ELSE 0 END) as greetings_sent,
                SUM(CASE WHEN phone IS NOT NULL AND phone != '' AND whatsapp_greeting_sent = FALSE THEN 1 ELSE 0 END) as pending_greetings,
                SUM(CASE WHEN phone IS NULL OR phone = '' THEN 1 ELSE 0 END) as no_phone_leads
            FROM leads
        `);

        res.json({
            serviceStats: stats,
            databaseStats: dbStats[0]
        });
    } catch (err) {
        console.error('Error getting WhatsApp stats:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get recent WhatsApp errors for debugging
exports.getWhatsAppErrors = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const errors = await whatsappService.getRecentErrors(parseInt(limit));
        res.json(errors);
    } catch (err) {
        console.error('Error getting WhatsApp errors:', err);
        res.status(500).json({ error: err.message });
    }
};

// Resend WhatsApp greeting for failed attempts
exports.resendWhatsAppGreeting = async (req, res) => {
    const { leadId } = req.params;
    try {
        // Get lead details
        const [lead] = await pool.query(
            'SELECT id, sender_name, phone, subject, body, whatsapp_greeting_sent FROM leads WHERE id = ?',
            [leadId]
        );

        if (lead.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const leadData = lead[0];

        // Check if phone number is available
        if (!leadData.phone || leadData.phone.length < 10) {
            return res.status(400).json({ error: 'No valid phone number available for this lead' });
        }

        // Create personalized greeting message from email content
        let greetingMessage = `Hello 👋\nWelcome ${leadData.sender_name}!\n`;

        // Add subject if available
        if (leadData.subject && leadData.subject.trim()) {
            greetingMessage += `Regarding: ${leadData.subject}\n\n`;
        }

        // Add relevant part of email body (first 200 characters)
        if (leadData.body && leadData.body.trim()) {
            const cleanBody = leadData.body.replace(/\n+/g, ' ').trim();
            const shortBody = cleanBody.length > 200 ? cleanBody.substring(0, 200) + '...' : cleanBody;
            greetingMessage += `Message: ${shortBody}\n\n`;
        }

        greetingMessage += `Our salesman will reach you soon!!\n\nThanks for reaching out. Our team will contact you shortly.`;

        // Send WhatsApp greeting
        const result = await whatsappService.sendGreeting(
            leadData.phone,
            leadData.sender_name,
            leadData.id,
            greetingMessage
        );

        if (result.success) {
            // Mark as sent in database
            await whatsappService.markGreetingAsSent(leadId);
            res.json({
                message: 'WhatsApp greeting resent successfully',
                result: result
            });
        } else {
            res.status(500).json({
                error: 'Failed to resend WhatsApp greeting',
                details: result.error
            });
        }
    } catch (err) {
        console.error('Error resending WhatsApp greeting:', err);
        res.status(500).json({ error: err.message });
    }
};
