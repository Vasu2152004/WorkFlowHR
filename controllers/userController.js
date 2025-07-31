const { supabase, supabaseAdmin } = require('../config/supabase');
const { generateEmployeePassword, generateEmployeeId } = require('../utils/passwordGenerator');

// Add employee (HR only) - Comprehensive creation
const addEmployee = async (req, res) => {
  try {
    const { 
      email, 
      full_name, 
      department, 
      designation, 
      salary, 
      joining_date,
      phone_number,
      address,
      emergency_contact,
      pan_number,
      bank_account,
      leave_balance = 20
    } = req.body;
    
    const hrUser = req.user;

    // Validate required fields
    if (!email || !full_name || !department || !designation || !salary || !joining_date) {
      return res.status(400).json({ 
        error: 'Email, full name, department, designation, salary, and joining date are required' 
      });
    }

    // Generate employee ID and password
    const employeeId = generateEmployeeId();
    const employeePassword = generateEmployeePassword();

    // Create employee in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: employeePassword,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create comprehensive employee record
    const employeeData = {
      user_id: authData.user.id,
      employee_id: employeeId,
      full_name: full_name,
      email: email,
      department: department,
      designation: designation,
      salary: parseFloat(salary),
      joining_date: joining_date,
      phone_number: phone_number || null,
      address: address || null,
      emergency_contact: emergency_contact || null,
      pan_number: pan_number || null,
      bank_account: bank_account || null,
      leave_balance: parseInt(leave_balance),
      role: 'employee',
      company_id: hrUser.company_id,
      password: employeePassword // Store for email
    };

    // Insert into employees table using admin client to bypass RLS
    const { data: employeeRecord, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert([employeeData])
      .select()
      .single();

    if (employeeError) {
      // If employee creation fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create employee record: ' + employeeError.message });
    }

    // Also insert into users table using admin client to bypass RLS
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        full_name: full_name,
        email: email,
        password: employeePassword,
        role: 'employee',
        company_id: hrUser.company_id
      }]);

    if (userError) {
      // If user creation fails, delete the auth user and employee record
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('employees').delete().eq('user_id', authData.user.id);
      return res.status(500).json({ error: 'Failed to create user record: ' + userError.message });
    }

    // Send welcome email with credentials
    try {
      const emailData = {
        to: email,
        subject: 'Welcome to HRMS - Your Account Details',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to HRMS!</h2>
            <p>Dear ${full_name},</p>
            <p>Your employee account has been created successfully. Here are your login credentials:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Your Login Details:</h3>
              <p><strong>Employee ID:</strong> ${employeeId}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${employeePassword}</p>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Your Information:</h3>
              <p><strong>Department:</strong> ${department}</p>
              <p><strong>Designation:</strong> ${designation}</p>
              <p><strong>Joining Date:</strong> ${joining_date}</p>
              <p><strong>Leave Balance:</strong> ${leave_balance} days</p>
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security.</p>
            
            <p>Best regards,<br>HR Team</p>
          </div>
        `
      };

      // Send email (this will work if email is configured)
      const emailResponse = await fetch('http://localhost:3000/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });

      if (!emailResponse.ok) {
        console.log('Email sending failed, but employee created successfully');
      }
    } catch (emailError) {
      console.log('Email functionality not available, but employee created successfully');
    }

    res.status(201).json({
      message: 'Employee added successfully',
      employee: {
        id: authData.user.id,
        employee_id: employeeId,
        email: authData.user.email,
        full_name,
        department,
        designation,
        salary: parseFloat(salary),
        joining_date,
        role: 'employee',
        company_id: hrUser.company_id,
        password: employeePassword // Return password for HR reference
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
      .from('employees')
      .select('id, user_id, employee_id, full_name, email, department, designation, salary, joining_date, phone_number, address, emergency_contact, pan_number, bank_account, leave_balance, role, company_id, created_at, updated_at')
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
      .from('employees')
      .select('id, user_id, employee_id, full_name, email, department, designation, salary, joining_date, phone_number, address, emergency_contact, pan_number, bank_account, leave_balance, role, company_id, created_at, updated_at')
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
    const { 
      full_name, 
      email, 
      department, 
      designation, 
      salary, 
      joining_date,
      phone_number,
      address,
      emergency_contact,
      pan_number,
      bank_account,
      leave_balance
    } = req.body;

    // Validate required fields
    if (!full_name || !email || !department || !designation || !salary || !joining_date) {
      return res.status(400).json({ 
        error: 'Full name, email, department, designation, salary, and joining date are required' 
      });
    }

    // Check if employee exists and belongs to HR's company
    const { data: existingEmployee, error: checkError } = await supabase
      .from('employees')
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
      .from('employees')
      .update({ 
        full_name, 
        email,
        department,
        designation,
        salary: parseFloat(salary),
        joining_date,
        phone_number: phone_number || null,
        address: address || null,
        emergency_contact: emergency_contact || null,
        pan_number: pan_number || null,
        bank_account: bank_account || null,
        leave_balance: parseInt(leave_balance) || 20
      })
      .eq('id', id)
      .select('id, user_id, employee_id, full_name, email, department, designation, salary, joining_date, phone_number, address, emergency_contact, pan_number, bank_account, leave_balance, role, company_id, created_at, updated_at')
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
      .from('employees')
      .select('id, user_id')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .eq('role', 'employee')
      .single();

    if (checkError || !existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete from employees table
    const { error: employeeError } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (employeeError) {
      return res.status(500).json({ error: 'Failed to delete employee' });
    }

    // Delete user from Supabase Auth (this will cascade to our users table)
    if (existingEmployee.user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(existingEmployee.user_id);
      if (authError) {
        console.error('Auth deletion error:', authError);
        // Continue even if auth deletion fails, as the employee record is already deleted
      }
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
      .from('employees')
      .select('id, user_id, email')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .eq('role', 'employee')
      .single();

    if (checkError || !existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Generate new password
    const newPassword = generateEmployeePassword();

    // Update password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(existingEmployee.user_id, {
      password: newPassword
    });

    if (authError) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // Update password in our employees table
    const { error: updateError } = await supabase
      .from('employees')
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

// Get company profile (accessible by all authenticated users)
const getCompanyProfile = async (req, res) => {
  try {
    let { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', req.user.company_id)
      .single();

    if (error || !company) {
      // If company doesn't exist and user is HR, create a default company profile
      if (req.user.role === 'hr') {
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            id: req.user.company_id,
            name: 'Your Company Name',
            description: '',
            industry: '',
            founded_year: null,
            website: '',
            phone: '',
            address: '',
            email: '',
            mission: '',
            vision: '',
            values: ''
          })
          .select('*')
          .single();

        if (createError) {
          return res.status(500).json({ error: 'Failed to create company profile' });
        }

        company = newCompany;
      } else {
        return res.status(404).json({ error: 'Company not found' });
      }
    }

    res.json({ company });
  } catch (error) {
    console.error('Get company profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update company profile (HR only)
const updateCompanyProfile = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      industry, 
      founded_year, 
      website, 
      phone, 
      address, 
      email,
      mission,
      vision,
      values
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: 'Company name is required' 
      });
    }

    // Update company profile
    const { data: company, error } = await supabase
      .from('companies')
      .update({ 
        name,
        description: description || null,
        industry: industry || null,
        founded_year: founded_year || null,
        website: website || null,
        phone: phone || null,
        address: address || null,
        email: email || null,
        mission: mission || null,
        vision: vision || null,
        values: values || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.company_id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update company profile' });
    }

    res.json({ 
      message: 'Company profile updated successfully',
      company 
    });

  } catch (error) {
    console.error('Update company profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get employees for viewing (accessible by all authenticated users)
const getEmployeesForViewing = async (req, res) => {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, user_id, employee_id, full_name, email, department, designation, phone_number, joining_date, role, company_id, created_at')
      .eq('company_id', req.user.company_id)
      .order('full_name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    res.json({ employees });
  } catch (error) {
    console.error('Get employees for viewing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  addEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
  getCompanyProfile,
  updateCompanyProfile,
  getEmployeesForViewing
}; 