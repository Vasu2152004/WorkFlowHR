const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: errors.array()[0].msg || 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Validation middleware
const validateAdminSignup = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('company_name').trim().isLength({ min: 2 }).withMessage('Company name is required'),
  handleValidationErrors
];

const validateAddUser = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  handleValidationErrors
];

// Public routes
router.post('/signup', validateAdminSignup, authController.adminSignup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);

// Admin routes
router.post('/add-hr-manager', authenticateToken, validateAddUser, authController.addHRManager);
router.post('/add-hr-staff', authenticateToken, validateAddUser, authController.addHRStaff);

module.exports = router; 