const { supabase, supabaseAdmin } = require('../config/supabase');
const { generatePassword } = require('../utils/passwordGenerator');

// Add employee (HR only)
const addEmployee = async (req, res) => {
  try {
    const { email, full_name } = req.body;
    const hrUser = req.user;

    // Validate required fields
    if (!email || !full_name) {
      return res.status(400).json({ 
        error: 'Email and full name are required' 
      });
    }

    // Generate a secure password for the employee
    const employeePassword = generatePassword();

    // Create employee in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: employeePassword,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Manually create the employee in our users table
    const { error: userError } = await supabaseAdmin
      .rpc('create_employee_user', {
        user_id: authData.user.id,
        full_name: full_name,
        email: email,
        password: employeePassword,
        company_id: hrUser.company_id
      });

    if (userError) {
      // If user creation fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create employee in database' });
    }
    res.status(201).json({
      message: 'Employee added successfully',
      employee: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role: 'employee',
        company_id: hrUser.company_id,
        password: employeePassword // Return password for HR to share with employee
      }
    });

  } catch (error) {
    console.error('Add employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all employees (HR only)
const getEmployees = async (req, res) => {
  try {
    const { data: employees, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .eq('company_id', req.user.company_id)
      .eq('role', 'employee')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    res.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get employee by ID (HR only)
const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: employee, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .eq('role', 'employee')
      .single();

    if (error || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update employee (HR only)
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email } = req.body;

    // Validate required fields
    if (!full_name || !email) {
      return res.status(400).json({ 
        error: 'Full name and email are required' 
      });
    }

    // Check if employee exists and belongs to HR's company
    const { data: existingEmployee, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .eq('role', 'employee')
      .single();

    if (checkError || !existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Update employee
    const { data: employee, error } = await supabase
      .from('users')
      .update({ 
        full_name, 
        email 
      })
      .eq('id', id)
      .select('id, full_name, email, role, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update employee' });
    }

    res.json({ 
      message: 'Employee updated successfully',
      employee 
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete employee (HR only)
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists and belongs to HR's company
    const { data: existingEmployee, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .eq('role', 'employee')
      .single();

    if (checkError || !existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete user from Supabase Auth (this will cascade to our users table)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      return res.status(500).json({ error: 'Failed to delete employee' });
    }

    res.json({ message: 'Employee deleted successfully' });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset employee password (HR only)
const resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists and belongs to HR's company
    const { data: existingEmployee, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .eq('role', 'employee')
      .single();

    if (checkError || !existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword
    });

    if (authError) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // Update password in our users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update password in database' });
    }

    res.json({ 
      message: 'Employee password reset successfully',
      new_password: newPassword
    });

  } catch (error) {
    console.error('Reset employee password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  addEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword
}; 