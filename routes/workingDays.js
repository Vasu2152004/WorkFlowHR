const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  authenticateToken, 
  requireHR,
  requireHRManager
} = require('../middleware/auth');
const workingDaysController = require('../controllers/workingDaysController');

const router = express.Router();

// Validation middleware
const validateWorkingDaysConfig = [
  body('working_days_per_week').isInt({ min: 1, max: 7 }).withMessage('Working days per week must be between 1 and 7'),
  body('working_hours_per_day').isFloat({ min: 1, max: 24 }).withMessage('Working hours per day must be between 1 and 24'),
  body('monday_working').isBoolean().withMessage('Monday working must be a boolean'),
  body('tuesday_working').isBoolean().withMessage('Tuesday working must be a boolean'),
  body('wednesday_working').isBoolean().withMessage('Wednesday working must be a boolean'),
  body('thursday_working').isBoolean().withMessage('Thursday working must be a boolean'),
  body('friday_working').isBoolean().withMessage('Friday working must be a boolean'),
  body('saturday_working').isBoolean().withMessage('Saturday working must be a boolean'),
  body('sunday_working').isBoolean().withMessage('Sunday working must be a boolean'),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(err => err.msg)
      });
    }
    next();
  }
];

// Apply authentication to all routes
router.use(authenticateToken);

// Get working days configuration (hr, hr_manager, admin)
router.get('/config', requireHR, workingDaysController.getWorkingDaysConfig);

// Update working days configuration (hr, hr_manager, admin)
router.put('/config', requireHR, validateWorkingDaysConfig, workingDaysController.updateWorkingDaysConfig);

// Calculate working days in a month (for testing) - hr, hr_manager, admin
router.get('/calculate', requireHR, workingDaysController.calculateWorkingDaysInMonth);

module.exports = router;
