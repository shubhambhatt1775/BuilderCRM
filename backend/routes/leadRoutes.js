const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/all', auth, adminOnly, leadController.getAllLeads);
router.post('/assign', auth, adminOnly, leadController.assignLead);
router.get('/my-leads', auth, leadController.getSalesmanLeads);
router.post('/update-status', auth, leadController.updateLeadStatus);
router.get('/today-followups', auth, leadController.getTodayFollowups);
router.get('/admin-reports', auth, adminOnly, leadController.getAdminReports);

// Follow-up history routes
router.get('/followup-history/lead/:leadId', auth, leadController.getLeadFollowupHistory);
router.get('/followup-history/my-followups', auth, leadController.getSalesmanFollowupHistory);
router.get('/followup-history/all', auth, adminOnly, leadController.getAllFollowupHistory);
router.put('/followup/:followupId/status', auth, leadController.updateFollowupStatus);
router.get('/followup-stats', auth, leadController.getFollowupStats);

// Lead Tracking routes for Admin
router.get('/tracking/all', auth, adminOnly, leadController.getAllLeadTracking);
router.get('/tracking/lead/:leadId', auth, adminOnly, leadController.getLeadDetailedHistory);
router.get('/tracking/stats', auth, adminOnly, leadController.getLeadTrackingStats);

// History Tracking routes for Admin
router.get('/history/timeline', auth, adminOnly, leadController.getHistoryTimeline);
router.get('/history/activities', auth, adminOnly, leadController.getRecentActivities);

// Follow-up Management routes for Admin
router.get('/followup-status/all', auth, adminOnly, leadController.getAllFollowupStatusLeads);

module.exports = router;
