const { supabase, supabaseAdmin } = require('../config/supabase');

// Get all HR staff for a company (HR Manager only)
const getCompanyHRs = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role !== 'hr_manager') {
      return res.status(403).json({ error: 'Only HR managers can access company HRs' });
    }

    const { data: hrStaff, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        full_name,
        email,
        role,
        created_at,
        employees (
          id,
          department,
          designation
        )
      `)
      .eq('company_id', currentUser.company_id)
      .in('role', ['hr', 'hr_manager'])
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ hrStaff });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new HR staff (HR Manager only)
const addHRStaff = async (req, res) => {
  try {
    const currentUser = req.user;
    const { full_name, email, password, role, department, designation } = req.body;

    if (currentUser.role !== 'hr_manager') {
      return res.status(403).json({ error: 'Only HR managers can add HR staff' });
    }

    // Validate required fields
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate role
    if (!['hr', 'hr_manager'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "hr" or "hr_manager"' });
    }

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({ error: checkError.message });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        company_id: currentUser.company_id
      }
    });

    if (userError) {
      return res.status(500).json({ error: userError.message });
    }

    // Insert user record
    const { data: userRecord, error: recordError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: user.user.id,
        full_name,
        email,
        role,
        company_id: currentUser.company_id
      }])
      .select()
      .single();

    if (recordError) {
      return res.status(500).json({ error: recordError.message });
    }

    // Create employee record if department/designation provided
    if (department || designation) {
      const { error: empError } = await supabaseAdmin
        .from('employees')
        .insert([{
          user_id: user.user.id,
          full_name,
          email,
          department: department || null,
          designation: designation || null,
          company_id: currentUser.company_id,
          created_by: currentUser.id
        }]);

      if (empError) {
        return res.status(500).json({ error: empError.message });
      }
    }

    res.status(201).json({
      message: 'HR staff added successfully',
      user: userRecord
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get HR Manager dashboard data
const getHRManagerDashboard = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role !== 'hr_manager') {
      return res.status(403).json({ error: 'Only HR managers can access dashboard' });
    }

    // Get total employees count
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('company_id', currentUser.company_id);

    if (empError) {
      return res.status(500).json({ error: empError.message });
    }

    // Get pending leave requests count
    const { data: pendingRequests, error: leaveError } = await supabaseAdmin
      .from('leave_requests')
      .select('id')
      .eq('company_id', currentUser.company_id)
      .eq('status', 'pending');

    if (leaveError) {
      return res.status(500).json({ error: leaveError.message });
    }

    // Get HR staff count
    const { data: hrStaff, error: hrError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', currentUser.company_id)
      .in('role', ['hr', 'hr_manager']);

    if (hrError) {
      return res.status(500).json({ error: hrError.message });
    }

    // Get recent leave requests
    const { data: recentRequests, error: recentError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        status,
        applied_at,
        employees (
          full_name,
          email
        )
      `)
      .eq('company_id', currentUser.company_id)
      .order('applied_at', { ascending: false })
      .limit(5);

    if (recentError) {
      return res.status(500).json({ error: recentError.message });
    }

    const dashboardData = {
      totalEmployees: employees?.length || 0,
      pendingRequests: pendingRequests?.length || 0,
      hrStaffCount: hrStaff?.length || 0,
      recentRequests: recentRequests || []
    };

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reassign employee to different HR (HR Manager only)
const reassignEmployee = async (req, res) => {
  try {
    const currentUser = req.user;
    const { employee_id, new_hr_id } = req.body;

    if (currentUser.role !== 'hr_manager') {
      return res.status(403).json({ error: 'Only HR managers can reassign employees' });
    }

    if (!employee_id || !new_hr_id) {
      return res.status(400).json({ error: 'Employee ID and new HR ID are required' });
    }

    // Verify employee belongs to the same company
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, company_id')
      .eq('id', employee_id)
      .eq('company_id', currentUser.company_id)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Verify new HR belongs to the same company
    const { data: newHR, error: hrError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', new_hr_id)
      .eq('company_id', currentUser.company_id)
      .in('role', ['hr', 'hr_manager'])
      .single();

    if (hrError || !newHR) {
      return res.status(404).json({ error: 'HR staff not found' });
    }

    // Update employee's HR assignment
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ created_by: new_hr_id })
      .eq('id', employee_id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ message: 'Employee reassigned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCompanyHRs,
  addHRStaff,
  getHRManagerDashboard,
  reassignEmployee
}; 