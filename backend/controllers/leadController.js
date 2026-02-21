const pool = require('../config/db');

exports.getAllLeads = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
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
        const [rows] = await pool.query('SELECT * FROM leads WHERE assigned_to = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateLeadStatus = async (req, res) => {
    const { leadId, status, remarks, followupDate, bookingDetails } = req.body;
    const salesmanId = req.user.id;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update lead status
        await connection.query('UPDATE leads SET status = ? WHERE id = ?', [status, leadId]);

        // 2. Mark all previous pending followups for this lead as 'Completed'
        await connection.query('UPDATE followups SET status = ? WHERE lead_id = ? AND status = ?', ['Completed', leadId, 'Pending']);

        // 3. Handle specific status cases
        if (status === 'Follow-up') {
            await connection.query('INSERT INTO followups (lead_id, followup_date, remarks) VALUES (?, ?, ?)',
                [leadId, followupDate, remarks]);
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
