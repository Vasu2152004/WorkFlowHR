const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireHR, validateCompanyAccess } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Validation middleware
const validateAddEmployee = [
  body('email').isEmail().normalizeEmail(),
  body('full_name').trim().isLength({ min: 2 })
];

const validateUpdateEmployee = [
  body('email').isEmail().normalizeEmail(),
  body('full_name').trim().isLength({ min: 2 })
];

const validateUpdateCompanyProfile = [
  body('name').trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('website').optional().isURL()
];

// Apply authentication to all routes
router.use(authenticateToken);
router.use(validateCompanyAccess);

// Company profile routes
router.get('/company/profile', userController.getCompanyProfile);
router.put('/company/profile', requireHR, validateUpdateCompanyProfile, userController.updateCompanyProfile);

// Employee viewing routes (accessible by all authenticated users)
router.get('/employees/view', userController.getEmployeesForViewing);

// HR-only routes (require HR role)
router.post('/employees', requireHR, validateAddEmployee, userController.addEmployee);
router.get('/employees', requireHR, userController.getEmployees);
router.get('/employees/:id', requireHR, userController.getEmployee);
router.put('/employees/:id', requireHR, validateUpdateEmployee, userController.updateEmployee);
router.delete('/employees/:id', requireHR, userController.deleteEmployee);
router.post('/employees/:id/reset-password', requireHR, userController.resetEmployeePassword);

module.exports = router; 