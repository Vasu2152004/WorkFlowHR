const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Get user details from our users table using admin client to bypass RLS
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ error: 'User not found in system' });
    }

    req.user = userData;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is HR
const requireHR = (req, res, next) => {
  if (req.user.role !== 'hr') {
    return res.status(403).json({ error: 'HR access required' });
  }
  next();
};

// Middleware to check if user is employee
const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee') {
    return res.status(403).json({ error: 'Employee access required' });
  }
  next();
};

// Middleware to check if user is HR or employee
const requireHROrEmployee = (req, res, next) => {
  if (req.user.role !== 'hr' && req.user.role !== 'employee') {
    return res.status(403).json({ error: 'Valid user access required' });
  }
  next();
};

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
    console.error('Company validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  requireHR,
  requireEmployee,
  requireHROrEmployee,
  validateCompanyAccess
}; 