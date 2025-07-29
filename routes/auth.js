const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  hrSignup,
  login,
  logout,
  getProfile,
  refreshToken
} = require('../controllers/authController');

const router = express.Router();

// Validation middleware
const validateSignup = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().isLength({ min: 2 }),
  body('company_name').trim().isLength({ min: 2 })
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const validateRefreshToken = [
  body('refresh_token').notEmpty()
];

// Routes
router.post('/signup', validateSignup, hrSignup);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.get('/profile', authenticateToken, getProfile);
router.post('/refresh', validateRefreshToken, refreshToken);

module.exports = router; 