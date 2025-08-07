const express = require('express');
const { body } = require('express-validator');
const { 
  authenticateToken, 
  requireHR 
} = require('../middleware/auth');
const salaryController = require('../controllers/salaryController');

const router = express.Router();

// Validation middleware
const validateGenerateSalarySlip = [
  body('employee_id').isUUID().withMessage('Valid employee ID is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Valid year is required'),
  body('additions').isArray().optional(),
  body('deductions').isArray().optional(),
  body('notes').isString().optional()
];

const validateAddSalaryComponent = [
  body('name').trim().isLength({ min: 2 }).withMessage('Component name is required'),
  body('description').isString().optional(),
  body('component_type').isIn(['addition', 'deduction']).withMessage('Component type must be addition or deduction')
];

const validateFixedDeduction = [
  body('employee_id').isUUID().withMessage('Valid employee ID is required'),
  body('deduction_name').trim().isLength({ min: 2 }).withMessage('Deduction name is required'),
  body('deduction_type').isIn(['fixed', 'percentage']).withMessage('Deduction type must be fixed or percentage'),
  body('amount').isFloat({ min: 0 }).optional(),
  body('percentage').isFloat({ min: 0, max: 100 }).optional(),
  body('description').isString().optional()
];

// Apply authentication to all routes
router.use(authenticateToken);

// Salary components routes
router.get('/components', requireHR, salaryController.getSalaryComponents);
router.post('/components', requireHR, validateAddSalaryComponent, salaryController.addSalaryComponent);

// Salary slip routes
router.post('/generate', requireHR, validateGenerateSalarySlip, salaryController.generateSalarySlip);
router.get('/employee/:employee_id', requireHR, salaryController.getEmployeeSalarySlips);
router.get('/my-slips', salaryController.getMySalarySlips); // New route for employees to view their own slips
router.get('/slip/:slip_id', requireHR, salaryController.getSalarySlipDetails);
router.get('/my-slip/:slip_id', salaryController.getMySalarySlipDetails); // New route for employees to view their own slip details
router.get('/all', requireHR, salaryController.getAllSalarySlips);

// Fixed deductions routes
router.get('/fixed-deductions/:employee_id', requireHR, salaryController.getEmployeeFixedDeductionsList);
router.post('/fixed-deductions', requireHR, validateFixedDeduction, salaryController.addEmployeeFixedDeduction);
router.put('/fixed-deductions/:deduction_id', requireHR, validateFixedDeduction, salaryController.updateEmployeeFixedDeduction);
router.delete('/fixed-deductions/:deduction_id', requireHR, salaryController.deleteEmployeeFixedDeduction);

module.exports = router; 