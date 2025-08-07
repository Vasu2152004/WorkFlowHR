const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getTeamMembers,
  getPendingLeaveRequests,
  approveLeaveRequest,
  getTeamLeadDashboard
} = require('../controllers/teamLeadController');

// Team Lead routes - all require authentication
router.use(authenticateToken);

// Get team members
router.get('/team-members', getTeamMembers);

// Get pending leave requests for team lead approval
router.get('/leave-requests/pending', getPendingLeaveRequests);

// Approve/Reject leave request
router.put('/leave-requests/:id/approve', approveLeaveRequest);

// Get team lead dashboard
router.get('/dashboard', getTeamLeadDashboard);

module.exports = router; 