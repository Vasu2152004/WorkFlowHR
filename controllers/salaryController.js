const { supabase, supabaseAdmin } = require('../config/supabase')
const emailService = require('../utils/emailService')
const { generateSalarySlipPDF } = require('../utils/salarySlipPDF')
const { 
  calculateWorkingDaysInMonth, 
  calculateDailySalary, 
  calculateWorkingDaysBetween,
  calculateLeaveDays
} = require('../utils/workingDaysCalculator')

// Get salary components
const getSalaryComponents = async (req, res) => {
  try {
    const currentUser = req.user;

    // Check if user has permission
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: components, error } = await supabaseAdmin
      .from('salary_components')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ components });
  } catch (error) {
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
        return [];
      }
      throw new Error(error.message);
    }

    return deductions || [];
  } catch (error) {
    return [];
  }
};

// Calculate leave impact on salary
const calculateLeaveImpact = async (employeeId, month, year) => {
  try {
    // Get employee's annual salary and company_id
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('salary, company_id')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      throw new Error('Employee not found');
    }

    // Get leave requests for the specific month and year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get unpaid leave requests for the month
    const { data: unpaidLeaves, error: leaveError } = await supabaseAdmin
      .from('leave_requests')
      .select('total_days, leave_type_id')
      .eq('employee_id', employeeId)
      .eq('status', 'approved_by_hr')
      .gte('start_date', startDate.toISOString().split('T')[0])
      .lte('end_date', endDate.toISOString().split('T')[0])
      .in('leave_type_id', ['550e8400-e29b-41d4-a716-446655440003']); // Only personal leave is unpaid

    if (leaveError) {
      // If table doesn't exist, continue with no leaves
      if (leaveError.code === '42P01') {
        return 0;
      }
      throw new Error(leaveError.message);
    }

    // Calculate total unpaid days
    const totalUnpaidDays = unpaidLeaves?.reduce((sum, leave) => sum + (leave.total_days || 0), 0) || 0;

    // Calculate daily salary rate
    const workingDaysInMonth = await calculateWorkingDaysInMonth(employee.company_id, month, year);
    const dailySalaryRate = workingDaysInMonth > 0 ? employee.salary / workingDaysInMonth : 0;

    // Calculate leave impact
    const leaveImpact = totalUnpaidDays * dailySalaryRate;

    // Store leave impact for future reference (optional)
    try {
      await supabaseAdmin
        .from('leave_salary_impact')
        .upsert([{
          employee_id: employeeId,
          month,
          year,
          unpaid_days: totalUnpaidDays,
          impact_amount: leaveImpact,
          created_at: new Date().toISOString()
        }]);
    } catch (impactError) {
      // If table doesn't exist, continue without storing
      if (impactError.code !== '42P01') {
        // Only log if it's not a table doesn't exist error
      }
    }

    return leaveImpact;
  } catch (error) {
    return 0;
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

    // Calculate salary components using new working days calculation
    const totalWorkingDaysInMonth = await calculateWorkingDaysInMonth(employee.company_id, month, year);
    const actualWorkingDays = totalWorkingDaysInMonth - (await calculateLeaveDays(employee.company_id, new Date(year, month - 1, 1), new Date(year, month, 0)));
    
    // Calculate daily salary using 30 days per month (as requested)
    const dailySalary = calculateDailySalary(employee.salary, 30);
    
    // Calculate gross salary based on 30 days per month (monthly salary)
    const monthlySalary = employee.salary / 12; // ₹30,000 for ₹360,000 annual salary
    const grossSalary = monthlySalary; // Gross salary should be the monthly salary
    
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
                           leaveImpact + totalFixedDeductions;

    const netSalary = grossSalary + totalAdditions - totalDeductions;

    // Create salary slip with company_id
    const { data: salarySlip, error: slipError } = await supabaseAdmin
      .from('salary_slips')
      .insert([{
        employee_id,
        month,
        year,
        basic_salary: monthlySalary, // Store monthly basic salary
        total_working_days: totalWorkingDaysInMonth,
        actual_working_days: actualWorkingDays,
        unpaid_leaves: (await calculateLeaveDays(employee.company_id, new Date(year, month - 1, 1), new Date(year, month, 0))),
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
        // Don't fail the entire operation if details fail
      }
    }

    // Send email notification to employee with PDF attachment
    try {
      // Get salary slip details for PDF generation
      const { data: slipDetails, error: detailsError } = await supabaseAdmin
        .from('salary_slip_details')
        .select('*')
        .eq('salary_slip_id', salarySlip.id)
        .order('component_type', { ascending: true })
        .order('created_at', { ascending: true });

      const details = detailsError ? [] : (slipDetails || []);
      
      await emailService.sendSalarySlipNotification(salarySlip, employee, details)
    } catch (emailError) {
      // Don't fail the entire operation if email fails
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
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Download salary slip for current employee
const downloadMySalarySlip = async (req, res) => {
  try {
    const { slip_id } = req.params;
    const currentUser = req.user;

    // Get employee ID for current user
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, email, employee_id, department, designation')
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

    // Generate PDF
    try {
      const pdfBuffer = await generateSalarySlipPDF(salarySlip, employee, details || []);
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="salary_slip_${employee.full_name.replace(/\s+/g, '_')}_${new Date(salarySlip.year, salarySlip.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(/\s+/g, '_')}.pdf"`);
      
      res.send(pdfBuffer);
    } catch (pdfError) {
      return res.status(500).json({ error: 'Failed to generate PDF' });
    }
  } catch (error) {
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
  getMySalarySlipDetails,
  downloadMySalarySlip
}; 