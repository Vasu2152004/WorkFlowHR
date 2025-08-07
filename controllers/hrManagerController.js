const { supabase, supabaseAdmin } = require('../config/supabase');
const { generateEmployeePassword, generateEmployeeId } = require('../utils/passwordGenerator');

// Get all HRs in the company (HR Manager only)
const getCompanyHRs = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role !== 'hr_manager') {
      return res.status(403).json({ error: 'Only HR Managers can access this endpoint' });
    }

    const { data: hrs, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, created_at')
      .eq('company_id', currentUser.company_id)
      .eq('role', 'hr')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ hrs });
  } catch (error) {
    console.error('Get company HRs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new HR (HR Manager only)
const addHR = async (req, res) => {
  try {
    const { email, full_name, password } = req.body;
    const currentUser = req.user;

    if (currentUser.role !== 'hr_manager') {
      return res.status(403).json({ error: 'Only HR Managers can add HRs' });
    }

    // Validate required fields
    if (!email || !full_name || !password) {
      return res.status(400).json({ 
        error: 'Email, full name, and password are required' 
      });
    }

    // Create HR in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create HR record in users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        full_name: full_name,
        email: email,
        password: password,
        role: 'hr',
        company_id: currentUser.company_id,
        created_by: currentUser.id
      }]);

    if (userError) {
      // If user creation fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create HR record: ' + userError.message });
    }

    res.status(201).json({
      message: 'HR added successfully',
      hr: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role: 'hr',
        company_id: currentUser.company_id
      }
    });

  } catch (error) {
    console.error('Add HR error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get HR Manager dashboard stats
const getHRManagerDashboard = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role !== 'hr_manager') {
      return res.status(403).json({ error: 'Only HR Managers can access dashboard' });
    }

    // Get total employees count
    const { count: totalEmployees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', currentUser.company_id);

    if (employeesError) {
      return res.status(500).json({ error: employeesError.message });
    }

    // Get total HRs count
    const { count: totalHRs, error: hrsError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', currentUser.company_id)
      .eq('role', 'hr');

    if (hrsError) {
      return res.status(500).json({ error: hrsError.message });
    }

    // Get pending leave requests count
    const { count: pendingLeaves, error: leavesError } = await supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved_by_team_lead');

    if (leavesError) {
      return res.status(500).json({ error: leavesError.message });
    }

    // Get recent leave requests
    const { data: recentLeaves, error: recentError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!inner(full_name, email, department)
      `)
      .eq('status', 'approved_by_team_lead')
      .order('applied_at', { ascending: false })
      .limit(5);

    if (recentError) {
      return res.status(500).json({ error: recentError.message });
    }

    res.json({
      dashboard: {
        totalEmployees,
        totalHRs,
        pendingLeaves,
        recentLeaves
      }
    });
  } catch (error) {
    console.error('Get HR Manager dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reassign employee to different HR
const reassignEmployee = async (req, res) => {
  try {
    const { employee_id, new_hr_id } = req.body;
    const currentUser = req.user;

    if (currentUser.role !== 'hr_manager') {
      return res.status(403).json({ error: 'Only HR Managers can reassign employees' });
    }

    if (!employee_id || !new_hr_id) {
      return res.status(400).json({ error: 'Employee ID and new HR ID are required' });
    }

    // Validate new HR
    const { data: newHR, error: hrError } = await supabaseAdmin
      .from('users')
      .select('id, role, company_id')
      .eq('id', new_hr_id)
      .eq('role', 'hr')
      .single();

    if (hrError || !newHR) {
      return res.status(400).json({ error: 'Invalid HR ID' });
    }

    if (newHR.company_id !== currentUser.company_id) {
      return res.status(400).json({ error: 'HR must be from the same company' });
    }

    // Update employee's created_by field
    const { data: updatedEmployee, error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ created_by: new_hr_id })
      .eq('id', employee_id)
      .eq('company_id', currentUser.company_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({
      message: 'Employee reassigned successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Reassign employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCompanyHRs,
  addHR,
  getHRManagerDashboard,
  reassignEmployee
}; 