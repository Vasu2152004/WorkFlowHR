const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const {
  getLeaveTypes,
  getLeaveBalance,
  createLeaveRequest,
  getLeaveRequests,
  updateLeaveRequest,
  getLeaveHistory,
  getUnpaidLeaveDays
} = require('../controllers/leaveController')

// Middleware to check if user is HR
const requireHR = (req, res, next) => {
  if (req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Access denied. HR role required.' })
  }
  next()
}

// Middleware to check if user is employee
const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee') {
    return res.status(403).json({ error: 'Access denied. Employee role required.' })
  }
  next()
}

// Get leave types (available to all authenticated users)
router.get('/types', authenticateToken, getLeaveTypes)

// Get leave balance for employee
router.get('/balance/:employee_id', authenticateToken, getLeaveBalance)

// Create leave request (employees only)
router.post('/requests', authenticateToken, requireEmployee, createLeaveRequest)

// Get leave requests (employees see their own, HR sees all)
router.get('/requests', authenticateToken, getLeaveRequests)

// Update leave request status (HR only)
router.put('/requests/:id', authenticateToken, requireHR, updateLeaveRequest)

// Get leave history for employee
router.get('/history/:employee_id', authenticateToken, getLeaveHistory)

// Get unpaid leave days for salary calculation
router.get('/unpaid-days', authenticateToken, getUnpaidLeaveDays)

module.exports = router 