const express = require('express');
const { body } = require('express-validator');
const { 
  authenticateToken, 
  requireHR
} = require('../middleware/auth');
const companyCalendarController = require('../controllers/companyCalendarController');

const router = express.Router();

// Validation middleware
const validateCalendarEvent = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title must be between 1 and 255 characters'),
  body('date').isISO8601().withMessage('Date must be a valid ISO date'),
  body('type').optional().isIn(['holiday', 'special_day', 'company_event', 'optional_holiday']).withMessage('Invalid event type'),
  body('is_recurring').optional().isBoolean().withMessage('is_recurring must be a boolean'),
  body('recurring_pattern').optional().isIn(['yearly', 'monthly', 'weekly']).withMessage('Invalid recurring pattern')
];

// Apply authentication to all routes
router.use(authenticateToken);

// Get calendar events (all users can view)
router.get('/events', companyCalendarController.getCalendarEvents);

// Get calendar events by date range (all users can view)
router.get('/events/range', companyCalendarController.getCalendarEventsByDateRange);

// Create calendar event (hr, hr_manager, admin only)
router.post('/events', requireHR, validateCalendarEvent, companyCalendarController.createCalendarEvent);

// Update calendar event (hr, hr_manager, admin only)
router.put('/events/:id', requireHR, validateCalendarEvent, companyCalendarController.updateCalendarEvent);

// Delete calendar event (hr, hr_manager, admin only)
router.delete('/events/:id', requireHR, companyCalendarController.deleteCalendarEvent);

module.exports = router;
