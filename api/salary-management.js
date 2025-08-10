const { createClient } = require('@supabase/supabase-js')

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Extract user ID from token
    if (!token.startsWith('demo-token-')) {
      return res.status(401).json({ error: 'Invalid token format' })
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's company_id and role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return res.status(401).json({ error: 'Invalid token - user not found' })
    }

    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'User has no company assigned' })
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGetSalaryData(req, res, supabase, currentUser)
      case 'POST':
        return await handleCreateSalaryData(req, res, supabase, currentUser)
      case 'PUT':
        return await handleUpdateSalaryData(req, res, supabase, currentUser)
      case 'DELETE':
        return await handleDeleteSalaryData(req, res, supabase, currentUser)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Salary Management API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

// Get salary data (slips, components, deductions)
async function handleGetSalaryData(req, res, supabase, currentUser) {
  try {
    const { type, employee_id, month, year, slip_id } = req.query
    
    // Handle different types of salary data requests
    if (type === 'components') {
      return await getSalaryComponents(res, supabase, currentUser)
    } else if (type === 'slips') {
      return await getSalarySlips(res, supabase, currentUser, { employee_id, month, year })
    } else if (type === 'slip-details') {
      return await getSalarySlipDetails(res, supabase, currentUser, slip_id)
    } else if (type === 'deductions') {
      return await getFixedDeductions(res, supabase, currentUser, employee_id)
    } else if (type === 'summary') {
      return await getSalarySummary(res, supabase, currentUser)
    } else {
      // Default: return all salary data
      return await getAllSalaryData(res, supabase, currentUser)
    }

  } catch (error) {
    console.error('Get salary data error:', error)
    return res.status(500).json({ error: 'Failed to fetch salary data' })
  }
}

// Get salary components
async function getSalaryComponents(res, supabase, currentUser) {
  try {
    const { data: components, error } = await supabase
      .from('salary_components')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({
      success: true,
      components: components || [],
      total: components?.length || 0
    })

  } catch (error) {
    console.error('Get salary components error:', error)
    return res.status(500).json({ error: 'Failed to fetch salary components' })
  }
}

// Get salary slips
async function getSalarySlips(res, supabase, currentUser, filters) {
  try {
    const { employee_id, month, year } = filters
    
    let query = supabase
      .from('salary_slips')
      .select(`
        *,
        users!inner(full_name, email)
      `)
      .eq('company_id', currentUser.company_id)

    // Apply filters
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }
    if (month) {
      query = query.eq('month', parseInt(month))
    }
    if (year) {
      query = query.eq('year', parseInt(year))
    }

    // If user is not HR, only show their own slips
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      query = query.eq('employee_id', currentUser.id)
    }

    const { data: salarySlips, error } = await query
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({
      success: true,
      salary_slips: salarySlips || [],
      total: salarySlips?.length || 0
    })

  } catch (error) {
    console.error('Get salary slips error:', error)
    return res.status(500).json({ error: 'Failed to fetch salary slips' })
  }
}

// Get salary slip details
async function getSalarySlipDetails(res, supabase, currentUser, slipId) {
  try {
    if (!slipId) {
      return res.status(400).json({ error: 'Slip ID is required' })
    }

    const { data: slipDetails, error } = await supabase
      .from('salary_slips')
      .select(`
        *,
        users!inner(full_name, email),
        salary_components!inner(name, component_type)
      `)
      .eq('id', slipId)
      .eq('company_id', currentUser.company_id)
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    if (!slipDetails) {
      return res.status(404).json({ error: 'Salary slip not found' })
    }

    // Check permissions
    if (slipDetails.employee_id !== currentUser.id && 
        !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'You can only view your own salary slips' })
    }

    res.status(200).json({
      success: true,
      slip_details: slipDetails
    })

  } catch (error) {
    console.error('Get salary slip details error:', error)
    return res.status(500).json({ error: 'Failed to fetch salary slip details' })
  }
}

// Get fixed deductions
async function getFixedDeductions(res, supabase, currentUser, employeeId) {
  try {
    const targetEmployeeId = employeeId || currentUser.id

    // Check if user has permission to view other employee's deductions
    if (employeeId && employeeId !== currentUser.id && 
        !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'You can only view your own deductions' })
    }

    const { data: deductions, error } = await supabase
      .from('fixed_deductions')
      .select('*')
      .eq('employee_id', targetEmployeeId)
      .eq('company_id', currentUser.company_id)
      .eq('is_active', true)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({
      success: true,
      employee_id: targetEmployeeId,
      deductions: deductions || [],
      total: deductions?.length || 0
    })

  } catch (error) {
    console.error('Get fixed deductions error:', error)
    return res.status(500).json({ error: 'Failed to fetch fixed deductions' })
  }
}

// Get salary summary
async function getSalarySummary(res, supabase, currentUser) {
  try {
    // Get summary statistics
    const { data: summary, error } = await supabase
      .from('salary_slips')
      .select('month, year, gross_salary, net_salary')
      .eq('company_id', currentUser.company_id)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    // Calculate summary
    const summaryData = {
      total_slips: summary?.length || 0,
      total_gross: summary?.reduce((sum, slip) => sum + (slip.gross_salary || 0), 0) || 0,
      total_net: summary?.reduce((sum, slip) => sum + (slip.net_salary || 0), 0) || 0,
      average_gross: summary?.length ? (summary.reduce((sum, slip) => sum + (slip.gross_salary || 0), 0) / summary.length) : 0,
      average_net: summary?.length ? (summary.reduce((sum, slip) => sum + (slip.net_salary || 0), 0) / summary.length) : 0
    }

    res.status(200).json({
      success: true,
      summary: summaryData
    })

  } catch (error) {
    console.error('Get salary summary error:', error)
    return res.status(500).json({ error: 'Failed to fetch salary summary' })
  }
}

// Get all salary data
async function getAllSalaryData(res, supabase, currentUser) {
  try {
    // Get components, slips, and deductions in parallel
    const [componentsResult, slipsResult, deductionsResult] = await Promise.all([
      supabase
        .from('salary_components')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .eq('is_active', true),
      supabase
        .from('salary_slips')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .eq('employee_id', currentUser.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false }),
      supabase
        .from('fixed_deductions')
        .select('*')
        .eq('employee_id', currentUser.id)
        .eq('company_id', currentUser.company_id)
        .eq('is_active', true)
    ])

    if (componentsResult.error || slipsResult.error || deductionsResult.error) {
      console.error('Database error:', componentsResult.error || slipsResult.error || deductionsResult.error)
      return res.status(500).json({ error: 'Failed to fetch salary data' })
    }

    res.status(200).json({
      success: true,
      components: componentsResult.data || [],
      salary_slips: slipsResult.data || [],
      deductions: deductionsResult.data || [],
      summary: {
        total_slips: slipsResult.data?.length || 0,
        total_deductions: deductionsResult.data?.length || 0,
        total_components: componentsResult.data?.length || 0
      }
    })

  } catch (error) {
    console.error('Get all salary data error:', error)
    return res.status(500).json({ error: 'Failed to fetch salary data' })
  }
}

// Create salary data (components, slips, deductions)
async function handleCreateSalaryData(req, res, supabase, currentUser) {
  try {
    const { action } = req.body

    switch (action) {
      case 'generate-slip':
        return await generateSalarySlip(req, res, supabase, currentUser)
      case 'add-component':
        return await addSalaryComponent(req, res, supabase, currentUser)
      case 'add-deduction':
        return await addFixedDeduction(req, res, supabase, currentUser)
      default:
        return res.status(400).json({ error: 'Invalid action. Use: generate-slip, add-component, or add-deduction' })
    }

  } catch (error) {
    console.error('Create salary data error:', error)
    return res.status(500).json({ error: 'Failed to create salary data' })
  }
}

// Generate salary slip
async function generateSalarySlip(req, res, supabase, currentUser) {
  try {
    // Check if user has HR permissions
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can generate salary slips' })
    }

    const {
      employee_id,
      month,
      year,
      basic_salary,
      additions = [],
      deductions = [],
      notes = ''
    } = req.body

    if (!employee_id || !month || !year || !basic_salary) {
      return res.status(400).json({ 
        error: 'Employee ID, month, year, and basic salary are required' 
      })
    }

    // Validate month and year
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' })
    }
    if (year < 2020 || year > 2030) {
      return res.status(400).json({ error: 'Year must be between 2020 and 2030' })
    }

    // Check if employee exists and belongs to the company
    const { data: employee, error: employeeError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', employee_id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Check if slip already exists for this month/year
    const { data: existingSlip, error: checkError } = await supabase
      .from('salary_slips')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('month', month)
      .eq('year', year)
      .eq('company_id', currentUser.company_id)
      .single()

    if (existingSlip) {
      return res.status(409).json({ error: 'Salary slip already exists for this month and year' })
    }

    // Calculate salary
    const grossSalary = basic_salary + (additions.reduce((sum, add) => sum + (add.amount || 0), 0))
    const totalDeductions = deductions.reduce((sum, ded) => sum + (ded.amount || 0), 0)
    const netSalary = grossSalary - totalDeductions

    // Generate UUID for new salary slip
    const { randomUUID } = require('crypto')
    const slipId = randomUUID()

    // Create salary slip
    const { data: newSlip, error: createError } = await supabase
      .from('salary_slips')
      .insert([{
        id: slipId,
        employee_id,
        company_id: currentUser.company_id,
        month,
        year,
        basic_salary,
        gross_salary: grossSalary,
        net_salary: netSalary,
        additions: additions || [],
        deductions: deductions || [],
        notes: notes || '',
        generated_by: currentUser.id,
        generated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (createError) {
      console.error('Salary slip creation error:', createError)
      return res.status(500).json({ 
        error: 'Failed to generate salary slip',
        message: createError.message 
      })
    }

    res.status(201).json({
      success: true,
      message: 'Salary slip generated successfully',
      salary_slip: {
        ...newSlip,
        employee_name: employee.full_name
      }
    })

  } catch (error) {
    console.error('Generate salary slip error:', error)
    return res.status(500).json({ error: 'Failed to generate salary slip' })
  }
}

// Add salary component
async function addSalaryComponent(req, res, supabase, currentUser) {
  try {
    // Check if user has HR permissions
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can add salary components' })
    }

    const {
      name,
      description,
      component_type,
      is_percentage = false,
      default_value = 0
    } = req.body

    if (!name || !component_type) {
      return res.status(400).json({ 
        error: 'Component name and type are required' 
      })
    }

    if (!['addition', 'deduction'].includes(component_type)) {
      return res.status(400).json({ 
        error: 'Component type must be either "addition" or "deduction"' 
      })
    }

    // Generate UUID for new component
    const { randomUUID } = require('crypto')
    const componentId = randomUUID()

    // Create salary component
    const { data: newComponent, error: createError } = await supabase
      .from('salary_components')
      .insert([{
        id: componentId,
        name,
        description: description || '',
        component_type,
        is_percentage,
        default_value,
        company_id: currentUser.company_id,
        created_by: currentUser.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (createError) {
      console.error('Salary component creation error:', createError)
      return res.status(500).json({ 
        error: 'Failed to add salary component',
        message: createError.message 
      })
    }

    res.status(201).json({
      success: true,
      message: 'Salary component added successfully',
      component: newComponent
    })

  } catch (error) {
    console.error('Add salary component error:', error)
    return res.status(500).json({ error: 'Failed to add salary component' })
  }
}

// Add fixed deduction
async function addFixedDeduction(req, res, supabase, currentUser) {
  try {
    // Check if user has HR permissions
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can add fixed deductions' })
    }

    const {
      employee_id,
      deduction_name,
      deduction_type,
      amount,
      percentage,
      description = ''
    } = req.body

    if (!employee_id || !deduction_name || !deduction_type) {
      return res.status(400).json({ 
        error: 'Employee ID, deduction name, and type are required' 
      })
    }

    if (!['fixed', 'percentage'].includes(deduction_type)) {
      return res.status(400).json({ 
        error: 'Deduction type must be either "fixed" or "percentage"' 
      })
    }

    if (deduction_type === 'fixed' && (!amount || amount <= 0)) {
      return res.status(400).json({ error: 'Amount is required for fixed deductions' })
    }

    if (deduction_type === 'percentage' && (!percentage || percentage <= 0 || percentage > 100)) {
      return res.status(400).json({ error: 'Valid percentage (1-100) is required for percentage deductions' })
    }

    // Check if employee exists and belongs to the company
    const { data: employee, error: employeeError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', employee_id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Generate UUID for new deduction
    const { randomUUID } = require('crypto')
    const deductionId = randomUUID()

    // Create fixed deduction
    const { data: newDeduction, error: createError } = await supabase
      .from('fixed_deductions')
      .insert([{
        id: deductionId,
        employee_id,
        company_id: currentUser.company_id,
        deduction_name,
        deduction_type,
        amount: deduction_type === 'fixed' ? amount : null,
        percentage: deduction_type === 'percentage' ? percentage : null,
        description,
        created_by: currentUser.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (createError) {
      console.error('Fixed deduction creation error:', createError)
      return res.status(500).json({ 
        error: 'Failed to add fixed deduction',
        message: createError.message 
      })
    }

    res.status(201).json({
      success: true,
      message: 'Fixed deduction added successfully',
      deduction: {
        ...newDeduction,
        employee_name: employee.full_name
      }
    })

  } catch (error) {
    console.error('Add fixed deduction error:', error)
    return res.status(500).json({ error: 'Failed to add fixed deduction' })
  }
}

// Update salary data
async function handleUpdateSalaryData(req, res, supabase, currentUser) {
  try {
    const { action } = req.body

    switch (action) {
      case 'update-slip':
        return await updateSalarySlip(req, res, supabase, currentUser)
      case 'update-component':
        return await updateSalaryComponent(req, res, supabase, currentUser)
      case 'update-deduction':
        return await updateFixedDeduction(req, res, supabase, currentUser)
      default:
        return res.status(400).json({ error: 'Invalid action. Use: update-slip, update-component, or update-deduction' })
    }

  } catch (error) {
    console.error('Update salary data error:', error)
    return res.status(500).json({ error: 'Failed to update salary data' })
  }
}

// Update salary slip
async function updateSalarySlip(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Slip ID is required' })
    }

    // Check if slip exists and belongs to the company
    const { data: existingSlip, error: fetchError } = await supabase
      .from('salary_slips')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingSlip) {
      return res.status(404).json({ error: 'Salary slip not found' })
    }

    // Check permissions - only HR can update slips
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can update salary slips' })
    }

    const {
      basic_salary,
      additions,
      deductions,
      notes
    } = req.body

    // Update slip
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (basic_salary !== undefined) updateData.basic_salary = basic_salary
    if (additions !== undefined) updateData.additions = additions
    if (deductions !== undefined) updateData.deductions = deductions
    if (notes !== undefined) updateData.notes = notes

    // Recalculate totals if basic salary or components changed
    if (basic_salary !== undefined || additions !== undefined || deductions !== undefined) {
      const newBasicSalary = basic_salary !== undefined ? basic_salary : existingSlip.basic_salary
      const newAdditions = additions !== undefined ? additions : existingSlip.additions
      const newDeductions = deductions !== undefined ? deductions : existingSlip.deductions

      const grossSalary = newBasicSalary + (newAdditions.reduce((sum, add) => sum + (add.amount || 0), 0))
      const totalDeductions = newDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0)
      const netSalary = grossSalary - totalDeductions

      updateData.gross_salary = grossSalary
      updateData.net_salary = netSalary
    }

    const { data: updatedSlip, error: updateError } = await supabase
      .from('salary_slips')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Salary slip update error:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update salary slip',
        message: updateError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Salary slip updated successfully',
      salary_slip: updatedSlip
    })

  } catch (error) {
    console.error('Update salary slip error:', error)
    return res.status(500).json({ error: 'Failed to update salary slip' })
  }
}

// Update salary component
async function updateSalaryComponent(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Component ID is required' })
    }

    // Check if component exists and belongs to the company
    const { data: existingComponent, error: fetchError } = await supabase
      .from('salary_components')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingComponent) {
      return res.status(404).json({ error: 'Salary component not found' })
    }

    // Check permissions - only HR can update components
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can update salary components' })
    }

    const {
      name,
      description,
      component_type,
      is_percentage,
      default_value,
      is_active
    } = req.body

    // Update component
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (component_type !== undefined) updateData.component_type = component_type
    if (is_percentage !== undefined) updateData.is_percentage = is_percentage
    if (default_value !== undefined) updateData.default_value = default_value
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedComponent, error: updateError } = await supabase
      .from('salary_components')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Salary component update error:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update salary component',
        message: updateError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Salary component updated successfully',
      component: updatedComponent
    })

  } catch (error) {
    console.error('Update salary component error:', error)
    return res.status(500).json({ error: 'Failed to update salary component' })
  }
}

// Update fixed deduction
async function updateFixedDeduction(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Deduction ID is required' })
    }

    // Check if deduction exists and belongs to the company
    const { data: existingDeduction, error: fetchError } = await supabase
      .from('fixed_deductions')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingDeduction) {
      return res.status(404).json({ error: 'Fixed deduction not found' })
    }

    // Check permissions - only HR can update deductions
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can update fixed deductions' })
    }

    const {
      deduction_name,
      deduction_type,
      amount,
      percentage,
      description,
      is_active
    } = req.body

    // Update deduction
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (deduction_name !== undefined) updateData.deduction_name = deduction_name
    if (deduction_type !== undefined) updateData.deduction_type = deduction_type
    if (amount !== undefined) updateData.amount = amount
    if (percentage !== undefined) updateData.percentage = percentage
    if (description !== undefined) updateData.description = description
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedDeduction, error: updateError } = await supabase
      .from('fixed_deductions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Fixed deduction update error:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update fixed deduction',
        message: updateError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Fixed deduction updated successfully',
      deduction: updatedDeduction
    })

  } catch (error) {
    console.error('Update fixed deduction error:', error)
    return res.status(500).json({ error: 'Failed to update fixed deduction' })
  }
}

// Delete salary data
async function handleDeleteSalaryData(req, res, supabase, currentUser) {
  try {
    const { action } = req.body

    switch (action) {
      case 'delete-slip':
        return await deleteSalarySlip(req, res, supabase, currentUser)
      case 'delete-component':
        return await deleteSalaryComponent(req, res, supabase, currentUser)
      case 'delete-deduction':
        return await deleteFixedDeduction(req, res, supabase, currentUser)
      default:
        return res.status(400).json({ error: 'Invalid action. Use: delete-slip, delete-component, or delete-deduction' })
    }

  } catch (error) {
    console.error('Delete salary data error:', error)
    return res.status(500).json({ error: 'Failed to delete salary data' })
  }
}

// Delete salary slip
async function deleteSalarySlip(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Slip ID is required' })
    }

    // Check if slip exists and belongs to the company
    const { data: existingSlip, error: fetchError } = await supabase
      .from('salary_slips')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingSlip) {
      return res.status(404).json({ error: 'Salary slip not found' })
    }

    // Check permissions - only HR can delete slips
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can delete salary slips' })
    }

    // Delete slip
    const { error: deleteError } = await supabase
      .from('salary_slips')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Salary slip deletion error:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete salary slip',
        message: deleteError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Salary slip deleted successfully',
      deleted_slip: {
        id: existingSlip.id,
        month: existingSlip.month,
        year: existingSlip.year
      }
    })

  } catch (error) {
    console.error('Delete salary slip error:', error)
    return res.status(500).json({ error: 'Failed to delete salary slip' })
  }
}

// Delete salary component
async function deleteSalaryComponent(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Component ID is required' })
    }

    // Check if component exists and belongs to the company
    const { data: existingComponent, error: fetchError } = await supabase
      .from('salary_components')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingComponent) {
      return res.status(404).json({ error: 'Salary component not found' })
    }

    // Check permissions - only HR can delete components
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can delete salary components' })
    }

    // Delete component
    const { error: deleteError } = await supabase
      .from('salary_components')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Salary component deletion error:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete salary component',
        message: deleteError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Salary component deleted successfully',
      deleted_component: {
        id: existingComponent.id,
        name: existingComponent.name
      }
    })

  } catch (error) {
    console.error('Delete salary component error:', error)
    return res.status(500).json({ error: 'Failed to delete salary component' })
  }
}

// Delete fixed deduction
async function deleteFixedDeduction(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Deduction ID is required' })
    }

    // Check if deduction exists and belongs to the company
    const { data: existingDeduction, error: fetchError } = await supabase
      .from('fixed_deductions')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingDeduction) {
      return res.status(404).json({ error: 'Fixed deduction not found' })
    }

    // Check permissions - only HR can delete deductions
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can delete fixed deductions' })
    }

    // Delete deduction
    const { error: deleteError } = await supabase
      .from('fixed_deductions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Fixed deduction deletion error:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete fixed deduction',
        message: deleteError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Fixed deduction deleted successfully',
      deleted_deduction: {
        id: existingDeduction.id,
        name: existingDeduction.deduction_name
      }
    })

  } catch (error) {
    console.error('Delete fixed deduction error:', error)
    return res.status(500).json({ error: 'Failed to delete fixed deduction' })
  }
}
