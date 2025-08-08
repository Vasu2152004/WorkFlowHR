const express = require('express');
const { body } = require('express-validator');
const { 
  authenticateToken, 
  requireHR, 
  requireHRManager,
  requireTeamLead,
  validateCompanyAccess,
  validateEmployeeAccess 
} = require('../middleware/auth');
const userController = require('../controllers/userController');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// Validation middleware
const validateAddEmployee = [
  body('email').isEmail().normalizeEmail(),
  body('full_name').trim().isLength({ min: 2 }),
  body('department').trim().isLength({ min: 2 }),
  body('designation').trim().isLength({ min: 2 }),
  body('salary').isNumeric(),
  body('joining_date').isDate()
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

// Test endpoint for development (returns mock data)
router.get('/test', (req, res) => {
  res.json({
    message: 'API is working!',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Mock data endpoint for development
router.get('/mock/employees', (req, res) => {
  const mockEmployees = [
    {
      id: 'emp-1',
      full_name: 'John Doe',
      email: 'john.doe@company.com',
      department: 'Engineering',
      designation: 'Senior Developer',
      salary: 75000,
      joining_date: '2023-01-15',
      phone_number: '+1234567890',
      leave_balance: 15,
      created_at: '2023-01-15T00:00:00Z',
      user: {
        id: 'user-1',
        full_name: 'John Doe',
        email: 'john.doe@company.com',
        role: 'employee',
        company_id: 'mock-company-id',
        is_active: true
      }
    },
    {
      id: 'emp-2',
      full_name: 'Jane Smith',
      email: 'jane.smith@company.com',
      department: 'Marketing',
      designation: 'Marketing Manager',
      salary: 65000,
      joining_date: '2023-02-20',
      phone_number: '+1234567891',
      leave_balance: 20,
      created_at: '2023-02-20T00:00:00Z',
      user: {
        id: 'user-2',
        full_name: 'Jane Smith',
        email: 'jane.smith@company.com',
        role: 'employee',
        company_id: 'mock-company-id',
        is_active: true
      }
    }
  ];

  res.json({ 
    employees: mockEmployees,
    total: mockEmployees.length,
    user_role: req.user?.role || 'unknown',
    company_id: req.user?.company_id || 'mock-company-id'
  });
});

// Dashboard endpoint
router.get('/dashboard', async (req, res) => {
  try {
    const { user } = req;
    
    // Get basic dashboard data based on user role
    const dashboardData = {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        company_id: user.company_id
      },
      stats: {
        totalEmployees: 0,
        pendingLeaveRequests: 0,
        leaveRequests: 0,
        salarySlipsGenerated: 0
      },
      recentEmployees: [],
      companyInfo: null
    };

    // Get employees count
    try {
      const { data: employees, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, full_name, email, department, designation, salary, joining_date, created_at')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!empError && employees) {
        dashboardData.stats.totalEmployees = employees.length;
        dashboardData.recentEmployees = employees;
      }
    } catch (error) {
      // Continue with 0 if employees fetch fails
    }

    // Get pending leave requests count
    try {
      const { data: pendingLeaveRequests, error: leaveError } = await supabaseAdmin
        .from('leave_requests')
        .select('id')
        .eq('status', 'pending')
        .eq('company_id', user.company_id);

      if (!leaveError && pendingLeaveRequests) {
        dashboardData.stats.pendingLeaveRequests = pendingLeaveRequests.length;
      }
    } catch (error) {
      // Continue with 0 if leave requests fetch fails
    }

    // Get total leave requests count
    try {
      const { data: leaveRequests, error: leaveError } = await supabaseAdmin
        .from('leave_requests')
        .select('id')
        .eq('company_id', user.company_id);

      if (!leaveError && leaveRequests) {
        dashboardData.stats.leaveRequests = leaveRequests.length;
      }
    } catch (error) {
      // Continue with 0 if leave requests fetch fails
    }

    // Get salary slips generated this month
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const { data: salarySlips, error: salaryError } = await supabaseAdmin
        .from('salary_slips')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (!salaryError && salarySlips) {
        dashboardData.stats.salarySlipsGenerated = salarySlips.length;
      }
    } catch (error) {
      // Continue with 0 if salary slips fetch fails
    }

    // Get company info
    try {
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();

      if (!companyError && company) {
        dashboardData.companyInfo = company;
      }
    } catch (error) {
      // Continue with null if company info fetch fails
    }

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/mock/company', (req, res) => {
  const mockCompany = {
    id: 'mock-company-id',
    name: 'Test Company Ltd.',
    address: '123 Business Street, Tech City, TC 12345',
    phone: '+1 (555) 123-4567',
    email: 'contact@testcompany.com',
    website: 'https://testcompany.com',
    logo_url: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  };

  res.json({ company: mockCompany });
});

// Company profile routes
router.get('/company/profile', userController.getCompanyProfile);
router.put('/company/profile', requireHR, validateUpdateCompanyProfile, userController.updateCompanyProfile);

// Employee viewing routes (accessible by all authenticated users)
router.get('/employees/view', userController.getEmployeesForViewing);

// Employee management routes with hierarchical access
router.post('/employees', requireHR, validateAddEmployee, userController.addEmployee);
router.get('/employees', userController.getEmployees);
router.get('/employees/:id', validateEmployeeAccess, userController.getEmployee);
router.put('/employees/:id', requireHR, validateEmployeeAccess, validateUpdateEmployee, userController.updateEmployee);
router.delete('/employees/:id', requireHR, validateEmployeeAccess, userController.deleteEmployee);
router.post('/employees/:id/reset-password', requireHR, validateEmployeeAccess, userController.resetEmployeePassword);

module.exports = router; 