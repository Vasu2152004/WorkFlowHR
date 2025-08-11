const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const { supabaseAdmin } = require('../config/supabase')

// Debug endpoint to check user role and permissions
router.get('/user-info', authenticateToken, (req, res) => {
  try {
    const user = req.user
    const isAdmin = user.role === 'admin'
    const isHRManager = user.role === 'hr_manager'
    const isHR = user.role === 'hr'
    const isEmployee = user.role === 'employee'

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company_id: user.company_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      permissions: {
        isAdmin,
        isHRManager,
        isHR,
        isEmployee,
        canManageTemplates: isAdmin || isHRManager || isHR,
        canManageDocuments: isAdmin || isHRManager || isHR,
        canManageLeaves: isAdmin || isHRManager || isHR,
        canManageSalary: isAdmin || isHRManager || isHR,
        canManageHRStaff: isAdmin || isHRManager,
        canCreateHRManager: isAdmin
      },
      roleCheck: {
        exactMatch: {
          admin: user.role === 'admin',
          hr_manager: user.role === 'hr_manager',
          hr: user.role === 'hr',
          employee: user.role === 'employee'
        },
        caseInsensitive: {
          admin: user.role.toLowerCase() === 'admin',
          hr_manager: user.role.toLowerCase() === 'hr_manager',
          hr: user.role.toLowerCase() === 'hr',
          employee: user.role.toLowerCase() === 'employee'
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

// Test database connection
router.get('/db-test', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({
        error: 'Supabase admin client not configured',
        message: 'Check environment variables'
      });
    }

    // Test basic connection by querying a simple table
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return res.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
        code: error.code
      });
    }

    res.json({
      status: 'success',
      message: 'Database connection working',
      data: data
    });

  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Debug endpoint to check database schema
router.get('/schema/employees', async (req, res) => {
  try {
    // Check if employees table exists
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'employees')
      .eq('table_schema', 'public')
      .single();

    if (tableError || !tableExists) {
      return res.json({
        exists: false,
        error: tableError?.message || 'Table not found',
        message: 'Employees table does not exist'
      });
    }

    // Get table structure
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'employees')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (columnsError) {
      return res.json({
        exists: true,
        error: columnsError.message,
        message: 'Could not retrieve table structure'
      });
    }

    res.json({
      exists: true,
      table_name: 'employees',
      columns: columns,
      message: 'Table structure retrieved successfully'
    });

  } catch (error) {
    console.error('Schema check error:', error);
    res.status(500).json({
      error: 'Failed to check schema',
      details: error.message
    });
  }
});

module.exports = router
