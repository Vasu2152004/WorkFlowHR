const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getCompanyHRs,
  addHR,
  getHRManagerDashboard,
  reassignEmployee
} = require('../controllers/hrManagerController');

// HR Manager routes - all require authentication
router.use(authenticateToken);

// Get all HRs in the company
router.get('/hrs', getCompanyHRs);

// Add new HR
router.post('/hrs', addHR);

// Get HR Manager dashboard
router.get('/dashboard', getHRManagerDashboard);

// Reassign employee to different HR
router.put('/employees/reassign', reassignEmployee);

module.exports = router; 