const { supabase, supabaseAdmin } = require('../config/supabase')
const emailService = require('../utils/emailService')

// Get all salary components (additions/deductions)
const getSalaryComponents = async (req, res) => {
  try {
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = supabaseAdmin
      .from('salary_components')
      .select('*')
      .eq('is_active', true)
      .order('component_type', { ascending: true })
      .order('name', { ascending: true });

    // Apply company isolation for non-admin users
    if (currentUser.role !== 'admin') {
      query = query.eq('company_id', currentUser.company_id);
    }

    const { data: components, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ components });
  } catch (error) {
    console.error('Get salary components error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new salary component
const addSalaryComponent = async (req, res) => {
  try {
    const { name, description, component_type } = req.body;
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate required fields
    if (!name || !component_type) {
      return res.status(400).json({ error: 'Name and component type are required' });
    }

    if (!['addition', 'deduction'].includes(component_type)) {
      return res.status(400).json({ error: 'Component type must be addition or deduction' });
    }

    const { data: component, error } = await supabaseAdmin
      .from('salary_components')
      .insert([{
        name,
        description,
        component_type,
        created_by: currentUser.id,
        company_id: currentUser.company_id,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Salary component added successfully',
      component
    });
  } catch (error) {
    console.error('Add salary component error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get employee fixed deductions
const getEmployeeFixedDeductions = async (employeeId) => {
  try {
    const { data: deductions, error } = await supabaseAdmin
      .from('employee_fixed_deductions')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .order('deduction_name', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array instead of throwing error
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('employee_fixed_deductions table does not exist');
        return [];
      }
      throw new Error(error.message);
    }

    return deductions || [];
  } catch (error) {
    console.error('Get employee fixed deductions error:', error);
    return [];
  }
};

// Calculate leave impact on salary
const calculateLeaveImpact = async (employeeId, month, year) => {
  try {
    // Get employee's annual salary
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('salary')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      throw new Error('Employee not found');
    }

    // Get leave requests for the specific month and year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    let leaves = [];
    let leaveError = null;

    try {
      // Get leave requests with leave type information
      const { data: leaveData, error: leaveErr } = await supabaseAdmin
        .from('leave_requests')
        .select(`
          *,
          leave_types (
            id,
            name,
            is_paid
          )
        `)
        .eq('employee_id', employeeId)
        .eq('status', 'approved_by_hr')
        .gte('start_date', startDate.toISOString().split('T')[0])
        .lte('end_date', endDate.toISOString().split('T')[0]);

      if (leaveErr) {
        // If table doesn't exist, just continue with empty leaves
        if (leaveErr.code === '42P01') { // Table doesn't exist
          console.warn('leave_requests table does not exist, continuing with no leaves');
          leaves = [];
        } else {
          throw new Error(leaveErr.message);
        }
      } else {
        leaves = leaveData || [];
      }
    } catch (error) {
      // If table doesn't exist, just continue with empty leaves
      if (error.message.includes('does not exist')) {
        console.warn('leave_requests table does not exist, continuing with no leaves');
        leaves = [];
      } else {
        throw error;
      }
    }

    // Calculate total leave days and unpaid leave days for the month
    let totalLeaveDays = 0;
    let unpaidLeaveDays = 0;
    
    if (leaves && leaves.length > 0) {
      leaves.forEach(leave => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        
        // Calculate working days between start and end dates for this month
        let current = new Date(Math.max(start, startDate));
        const monthEnd = new Date(Math.min(end, endDate));
        
        let leaveDaysInMonth = 0;
        while (current <= monthEnd) {
          // Skip weekends (0 = Sunday, 6 = Saturday)
          if (current.getDay() !== 0 && current.getDay() !== 6) {
            leaveDaysInMonth++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        totalLeaveDays += leaveDaysInMonth;
        
        // Check if this is an unpaid leave type
        const isUnpaidLeave = leave.leave_types && !leave.leave_types.is_paid;
        if (isUnpaidLeave) {
          unpaidLeaveDays += leaveDaysInMonth;
        }
      });
    }

    // Calculate daily salary (assuming 22 working days per month)
    const WORKING_DAYS_PER_MONTH = 22;
    const dailySalary = employee.salary / (WORKING_DAYS_PER_MONTH * 12);
    const leaveDeduction = dailySalary * unpaidLeaveDays;

    // Update or insert leave salary impact
    let impact = null;
    let impactError = null;

    try {
      const { data: impactData, error: impactErr } = await supabaseAdmin
        .from('leave_salary_impact')
        .upsert([{
          employee_id: employeeId,
          month,
          year,
          total_leaves: totalLeaveDays,
          paid_leaves: totalLeaveDays - unpaidLeaveDays,
          unpaid_leaves: unpaidLeaveDays,
          leave_deduction_amount: leaveDeduction
        }], { onConflict: 'employee_id,month,year' })
        .select()
        .single();

      if (impactErr) {
        // If table doesn't exist, just continue without storing impact
        if (impactErr.code === '42P01') { // Table doesn't exist
          console.warn('leave_salary_impact table does not exist, continuing without storing impact');
          impact = {
            total_leaves: totalLeaveDays,
            paid_leaves: totalLeaveDays - unpaidLeaveDays,
            unpaid_leaves: unpaidLeaveDays,
            leave_deduction_amount: leaveDeduction
          };
        } else {
          throw new Error(impactErr.message);
        }
      } else {
        impact = impactData;
      }
    } catch (error) {
      // If table doesn't exist, just continue without storing impact
      if (error.message.includes('does not exist')) {
        console.warn('leave_salary_impact table does not exist, continuing without storing impact');
        impact = {
          total_leaves: totalLeaveDays,
          paid_leaves: totalLeaveDays - unpaidLeaveDays,
          unpaid_leaves: unpaidLeaveDays,
          leave_deduction_amount: leaveDeduction
        };
      } else {
        throw error;
      }
    }

    return {
      totalLeaves: totalLeaveDays,
      paidLeaves: totalLeaveDays - unpaidLeaveDays,
      unpaidLeaves: unpaidLeaveDays,
      leaveDeduction,
      dailySalary
    };
  } catch (error) {
    console.error('Calculate leave impact error:', error);
    throw error;
  }
};

// Generate salary slip
const generateSalarySlip = async (req, res) => {
  try {
    const { 
      employee_id, 
      month, 
      year, 
      additions = [], 
      deductions = [],
      notes = ''
    } = req.body;
    
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate required fields
    if (!employee_id || !month || !year) {
      return res.status(400).json({ error: 'Employee ID, month, and year are required' });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }

    // Check if salary slip already exists for this month
    const { data: existingSlip, error: checkError } = await supabaseAdmin
      .from('salary_slips')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (existingSlip) {
      return res.status(400).json({ error: 'Salary slip already exists for this month' });
    }

    // Get employee details with company isolation
    let employeeQuery = supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', employee_id);

    // Apply company isolation for non-admin users
    if (currentUser.role !== 'admin') {
      employeeQuery = employeeQuery.eq('company_id', currentUser.company_id);
    }

    const { data: employee, error: empError } = await employeeQuery.single();

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found or access denied' });
    }

    // Calculate leave impact
    const leaveImpact = await calculateLeaveImpact(employee_id, month, year);

    // Get employee fixed deductions
    const fixedDeductions = await getEmployeeFixedDeductions(employee_id);
    const totalFixedDeductions = fixedDeductions.reduce((sum, deduction) => {
      if (deduction.deduction_type === 'percentage') {
        return sum + (employee.salary * deduction.percentage / 100);
      } else {
        return sum + deduction.amount;
      }
    }, 0);

    // Calculate salary components
    const WORKING_DAYS_PER_MONTH = 22;
    const actualWorkingDays = WORKING_DAYS_PER_MONTH - leaveImpact.unpaidLeaves;
    const dailySalary = employee.salary / (WORKING_DAYS_PER_MONTH * 12);
    const grossSalary = dailySalary * actualWorkingDays;

    // Process additions and deductions with proper validation
    const processedAdditions = additions.filter(item => 
      item.component_name && item.amount && parseFloat(item.amount) > 0
    ).map(item => ({
      component_id: item.component_id || null,
      component_name: item.component_name,
      component_type: 'addition',
      amount: parseFloat(item.amount),
      description: item.description || `Addition: ${item.component_name}`
    }));

    const processedDeductions = deductions.filter(item => 
      item.component_name && item.amount && parseFloat(item.amount) > 0
    ).map(item => ({
      component_id: item.component_id || null,
      component_name: item.component_name,
      component_type: 'deduction',
      amount: parseFloat(item.amount),
      description: item.description || `Deduction: ${item.component_name}`
    }));

    // Calculate totals
    const totalAdditions = processedAdditions.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = processedDeductions.reduce((sum, item) => sum + item.amount, 0) + 
                           leaveImpact.leaveDeduction + totalFixedDeductions;

    const netSalary = grossSalary + totalAdditions - totalDeductions;

    // Create salary slip with company_id
    const { data: salarySlip, error: slipError } = await supabaseAdmin
      .from('salary_slips')
      .insert([{
        employee_id,
        month,
        year,
        basic_salary: employee.salary,
        total_working_days: WORKING_DAYS_PER_MONTH,
        actual_working_days: actualWorkingDays,
        unpaid_leaves: leaveImpact.unpaidLeaves,
        gross_salary: grossSalary,
        total_additions: totalAdditions,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        generated_by: currentUser.id,
        company_id: employee.company_id,
        notes
      }])
      .select()
      .single();

    if (slipError) {
      return res.status(500).json({ error: slipError.message });
    }

    // Create salary slip details for all components
    const allComponents = [
      ...processedAdditions,
      ...processedDeductions,
      ...fixedDeductions.map(deduction => ({
        component_id: null,
        component_name: deduction.deduction_name,
        component_type: 'deduction',
        amount: deduction.deduction_type === 'percentage' ? (employee.salary * deduction.percentage / 100) : deduction.amount,
        description: deduction.description || `Fixed ${deduction.deduction_name}`
      }))
    ];

    if (allComponents.length > 0) {
      const slipDetails = allComponents.map(item => ({
        salary_slip_id: salarySlip.id,
        component_id: item.component_id,
        component_name: item.component_name,
        component_type: item.component_type,
        amount: item.amount,
        description: item.description
      }));

      const { error: detailsError } = await supabaseAdmin
        .from('salary_slip_details')
        .insert(slipDetails);

      if (detailsError) {
        console.error('Error creating salary slip details:', detailsError);
        // Don't fail the entire operation if details fail
      }
    }

    // Send email notification to employee
    try {
      await emailService.sendSalarySlipNotification(salarySlip, employee)
    } catch (emailError) {
      console.log('Email notification failed, but salary slip generated successfully:', emailError.message)
    }

    res.status(201).json({
      message: 'Salary slip generated successfully',
      salarySlip: {
        ...salarySlip,
        leaveImpact,
        components: allComponents
      }
    });

  } catch (error) {
    console.error('Generate salary slip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get salary slips for an employee
const getEmployeeSalarySlips = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: salarySlips, error } = await supabaseAdmin
      .from('salary_slips')
      .select(`
        *,
        employee:employees(full_name, email, employee_id)
      `)
      .eq('employee_id', employee_id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ salarySlips });
  } catch (error) {
    console.error('Get employee salary slips error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get salary slip details
const getSalarySlipDetails = async (req, res) => {
  try {
    const { slip_id } = req.params;
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get salary slip with employee details
    const { data: salarySlip, error: slipError } = await supabaseAdmin
      .from('salary_slips')
      .select(`
        *,
        employee:employees(full_name, email, employee_id, department, designation)
      `)
      .eq('id', slip_id)
      .single();

    if (slipError || !salarySlip) {
      return res.status(404).json({ error: 'Salary slip not found' });
    }

    // Get salary slip details
    const { data: details, error: detailsError } = await supabaseAdmin
      .from('salary_slip_details')
      .select('*')
      .eq('salary_slip_id', slip_id)
      .order('component_type', { ascending: true })
      .order('created_at', { ascending: true });

    if (detailsError) {
      return res.status(500).json({ error: detailsError.message });
    }

    res.json({
      salarySlip,
      details
    });
  } catch (error) {
    console.error('Get salary slip details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all salary slips (for HR dashboard)
const getAllSalarySlips = async (req, res) => {
  try {
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = supabaseAdmin
      .from('salary_slips')
      .select(`
        *,
        employee:employees(full_name, email, employee_id, department)
      `)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(50);

    // Apply company isolation for non-admin users
    if (currentUser.role !== 'admin') {
      query = query.eq('company_id', currentUser.company_id);
    }

    const { data: salarySlips, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ salarySlips });
  } catch (error) {
    console.error('Get all salary slips error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get employee fixed deductions
const getEmployeeFixedDeductionsList = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const deductions = await getEmployeeFixedDeductions(employee_id);
    res.json({ deductions });
  } catch (error) {
    console.error('Get employee fixed deductions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add employee fixed deduction
const addEmployeeFixedDeduction = async (req, res) => {
  try {
    const { employee_id, deduction_name, deduction_type, amount, percentage, description } = req.body;
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate required fields
    if (!employee_id || !deduction_name || !deduction_type) {
      return res.status(400).json({ error: 'Employee ID, deduction name, and type are required' });
    }

    if (!['fixed', 'percentage'].includes(deduction_type)) {
      return res.status(400).json({ error: 'Deduction type must be fixed or percentage' });
    }

    if (deduction_type === 'fixed' && !amount) {
      return res.status(400).json({ error: 'Amount is required for fixed deductions' });
    }

    if (deduction_type === 'percentage' && !percentage) {
      return res.status(400).json({ error: 'Percentage is required for percentage deductions' });
    }

    const { data: deduction, error } = await supabaseAdmin
      .from('employee_fixed_deductions')
      .insert([{
        employee_id,
        deduction_name,
        deduction_type,
        amount: amount || 0,
        percentage: percentage || 0,
        description,
        created_by: currentUser.id,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Fixed deduction added successfully',
      deduction
    });
  } catch (error) {
    console.error('Add employee fixed deduction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update employee fixed deduction
const updateEmployeeFixedDeduction = async (req, res) => {
  try {
    const { deduction_id } = req.params;
    const { deduction_name, deduction_type, amount, percentage, description, is_active } = req.body;
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {
      deduction_name,
      deduction_type,
      amount: amount || 0,
      percentage: percentage || 0,
      description,
      is_active
    };

    const { data: deduction, error } = await supabaseAdmin
      .from('employee_fixed_deductions')
      .update(updateData)
      .eq('id', deduction_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Fixed deduction updated successfully',
      deduction
    });
  } catch (error) {
    console.error('Update employee fixed deduction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete employee fixed deduction
const deleteEmployeeFixedDeduction = async (req, res) => {
  try {
    const { deduction_id } = req.params;
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error } = await supabaseAdmin
      .from('employee_fixed_deductions')
      .delete()
      .eq('id', deduction_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Fixed deduction deleted successfully' });
  } catch (error) {
    console.error('Delete employee fixed deduction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get salary slips for current employee (for employee dashboard)
const getMySalarySlips = async (req, res) => {
  try {
    const currentUser = req.user;

    // Get employee ID for current user
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('user_id', currentUser.id)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { data: salarySlips, error } = await supabaseAdmin
      .from('salary_slips')
      .select(`
        *,
        employee:employees(full_name, email, employee_id, department, designation)
      `)
      .eq('employee_id', employee.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ salarySlips: salarySlips || [] });
  } catch (error) {
    console.error('Get my salary slips error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get salary slip details for current employee
const getMySalarySlipDetails = async (req, res) => {
  try {
    const { slip_id } = req.params;
    const currentUser = req.user;

    // Get employee ID for current user
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('user_id', currentUser.id)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get salary slip with employee details (only if it belongs to current employee)
    const { data: salarySlip, error: slipError } = await supabaseAdmin
      .from('salary_slips')
      .select(`
        *,
        employee:employees(full_name, email, employee_id, department, designation)
      `)
      .eq('id', slip_id)
      .eq('employee_id', employee.id)
      .single();

    if (slipError || !salarySlip) {
      return res.status(404).json({ error: 'Salary slip not found' });
    }

    // Get salary slip details
    const { data: details, error: detailsError } = await supabaseAdmin
      .from('salary_slip_details')
      .select('*')
      .eq('salary_slip_id', slip_id)
      .order('component_type', { ascending: true })
      .order('created_at', { ascending: true });

    if (detailsError) {
      return res.status(500).json({ error: detailsError.message });
    }

    res.json({
      salarySlip,
      details: details || []
    });
  } catch (error) {
    console.error('Get my salary slip details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getSalaryComponents,
  addSalaryComponent,
  generateSalarySlip,
  getEmployeeSalarySlips,
  getSalarySlipDetails,
  getAllSalarySlips,
  getEmployeeFixedDeductionsList,
  addEmployeeFixedDeduction,
  updateEmployeeFixedDeduction,
  deleteEmployeeFixedDeduction,
  getMySalarySlips,
  getMySalarySlipDetails
}; 