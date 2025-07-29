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

// Apply authentication and company validation to all routes
router.use(authenticateToken);
router.use(requireHR);
router.use(validateCompanyAccess);

// Routes
router.post('/employees', validateAddEmployee, userController.addEmployee);
router.get('/employees', userController.getEmployees);
router.get('/employees/:id', userController.getEmployee);
router.put('/employees/:id', validateUpdateEmployee, userController.updateEmployee);
router.delete('/employees/:id', userController.deleteEmployee);
router.post('/employees/:id/reset-password', userController.resetEmployeePassword);

module.exports = router; 