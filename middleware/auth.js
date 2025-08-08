const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');

// Retry function for Supabase operations
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message.includes('timeout')) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Check if Supabase is configured
    if (!supabase || !supabaseAdmin) {
      return res.status(503).json({ 
        error: 'Database not configured. Please check environment variables.' 
      });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token with Supabase with retry logic
    const { data: { user }, error } = await retryOperation(async () => {
      return await supabase.auth.getUser(token);
    });

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Get user details from our users table using admin client to bypass RLS
    const { data: userData, error: userError } = await retryOperation(async () => {
      return await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    });

    if (userError || !userData) {
      // Get or create company with retry
      let { data: company } = await retryOperation(async () => {
        return await supabaseAdmin
          .from('companies')
          .select('*')
          .limit(1)
          .single();
      });

      if (!company) {
        const { data: newCompany } = await retryOperation(async () => {
          return await supabaseAdmin
            .from('companies')
            .insert([{ name: 'Default Company' }])
            .select()
            .single();
        });
        company = newCompany;
      }

      // Create user record with retry
      const { data: newUser, error: createError } = await retryOperation(async () => {
        return await supabaseAdmin
          .from('users')
          .insert([{
            id: user.id,
            full_name: user.email.split('@')[0],
            email: user.email,
            role: 'hr',
            company_id: company.id,
            is_active: true
          }])
          .select()
          .single();
      });

      if (createError) {
        return res.status(403).json({ error: 'User not found in system' });
      }

      req.user = newUser;
    } else {
      req.user = userData;
    }

    next();
  } catch (error) {
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message.includes('timeout')) {
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Hierarchical role checking middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user has any of the allowed roles (case-insensitive)
    const userRole = req.user.role.toLowerCase();
    const allowedRolesLower = allowedRoles.map(role => role.toLowerCase());
    
    if (!allowedRolesLower.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

// Specific role middleware functions
const requireHR = requireRole(['hr', 'hr_manager', 'admin']);
const requireHRManager = requireRole(['hr_manager', 'admin']);
const requireAdmin = requireRole(['admin']);
const requireTeamLead = requireRole(['team_lead', 'hr', 'hr_manager', 'admin']);
const requireEmployee = requireRole(['employee', 'team_lead', 'hr', 'hr_manager', 'admin']);

// Middleware to ensure users can only access their own company data
const validateCompanyAccess = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For user-specific operations, ensure they belong to the same company
    if (req.params.id && req.params.id !== user.id) {
      const targetUser = await supabaseAdmin
        .from('users')
        .select('company_id')
        .eq('id', req.params.id)
        .single();

      if (!targetUser.data || targetUser.data.company_id !== user.company_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user can access employee data based on hierarchy
const validateEmployeeAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const employeeId = req.params.id;

    if (!employeeId) {
      return next(); // No specific employee ID, let the controller handle it
    }

    // Get employee details
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (error || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check access based on role hierarchy
    let hasAccess = false;

    switch (user.role) {
      case 'admin':
        hasAccess = true; // Admin can access all employees
        break;
      case 'hr_manager':
        hasAccess = employee.company_id === user.company_id;
        break;
      case 'hr':
        hasAccess = employee.created_by === user.id || employee.company_id === user.company_id;
        break;
      case 'team_lead':
        hasAccess = employee.team_lead_id === user.id;
        break;
      case 'employee':
        hasAccess = employee.user_id === user.id;
        break;
      default:
        hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this employee' });
    }

    req.targetEmployee = employee;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  requireHR,
  requireHRManager,
  requireAdmin,
  requireTeamLead,
  requireEmployee,
  requireRole,
  validateCompanyAccess,
  validateEmployeeAccess
}; 