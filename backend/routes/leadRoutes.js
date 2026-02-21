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

module.exports = router;
