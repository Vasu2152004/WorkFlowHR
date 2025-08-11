const { createClient } = require('@supabase/supabase-js')

// Netlify serverless function handler
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST' && event.httpMethod !== 'PUT' && event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database configuration missing' })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Authorization header
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header missing' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Extract user ID from token
    if (!token.startsWith('demo-token-')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' })
      }
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's company_id and role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token - user not found' })
      }
    }

    if (!currentUser.company_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User has no company assigned' })
      }
    }

    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        return await handleGetSalaryData(event, headers, supabase, currentUser)
      case 'POST':
        return await handleCreateSalaryData(event, headers, supabase, currentUser)
      case 'PUT':
        return await handleUpdateSalaryData(event, headers, supabase, currentUser)
      case 'DELETE':
        return await handleDeleteSalaryData(event, headers, supabase, currentUser)
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

  } catch (error) {
    console.error('Salary Management API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

// Get salary data (slips, components, deductions)
async function handleGetSalaryData(event, headers, supabase, currentUser) {
  try {
    const { type, employee_id, month, year, slip_id } = event.queryStringParameters || {}
    
    // Handle different types of salary data requests
    if (type === 'components') {
      return await getSalaryComponents(headers, supabase, currentUser)
    } else if (type === 'slips') {
      return await getSalarySlips(headers, supabase, currentUser, { employee_id, month, year })
    } else if (type === 'slip-details') {
      return await getSalarySlipDetails(headers, supabase, currentUser, slip_id)
    } else if (type === 'deductions') {
      return await getFixedDeductions(headers, supabase, currentUser, employee_id)
    } else if (type === 'summary') {
      return await getSalarySummary(headers, supabase, currentUser)
    } else {
      // Default: return all salary data
      return await getAllSalaryData(headers, supabase, currentUser)
    }

  } catch (error) {
    console.error('Get salary data error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get salary components
async function getSalaryComponents(headers, supabase, currentUser) {
  try {
    const { data: components, error } = await supabase
      .from('salary_components')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('name', { ascending: true })

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch salary components' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(components)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get salary slips
async function getSalarySlips(headers, supabase, currentUser, filters) {
  try {
    let query = supabase
      .from('salary_slips')
      .select('*')
      .eq('company_id', currentUser.company_id)

    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id)
    }
    if (filters.month) {
      query = query.eq('month', filters.month)
    }
    if (filters.year) {
      query = query.eq('year', filters.year)
    }

    const { data: slips, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch salary slips' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(slips)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get salary slip details
async function getSalarySlipDetails(headers, supabase, currentUser, slipId) {
  try {
    if (!slipId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Slip ID is required' })
      }
    }

    const { data: slip, error } = await supabase
      .from('salary_slips')
      .select('*')
      .eq('id', slipId)
      .eq('company_id', currentUser.company_id)
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch salary slip details' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(slip)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get fixed deductions
async function getFixedDeductions(headers, supabase, currentUser, employeeId) {
  try {
    const targetEmployeeId = employeeId || currentUser.id

    const { data: deductions, error } = await supabase
      .from('fixed_deductions')
      .select('*')
      .eq('employee_id', targetEmployeeId)
      .eq('company_id', currentUser.company_id)

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch fixed deductions' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(deductions)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get salary summary
async function getSalarySummary(headers, supabase, currentUser) {
  try {
    const { data: summary, error } = await supabase
      .from('salary_slips')
      .select('month, year, count, total_amount')
      .eq('company_id', currentUser.company_id)
      .group('month, year')

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch salary summary' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(summary)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get all salary data
async function getAllSalaryData(headers, supabase, currentUser) {
  try {
    const [components, slips, deductions] = await Promise.all([
      getSalaryComponents(headers, supabase, currentUser),
      getSalarySlips(headers, supabase, currentUser, {}),
      getFixedDeductions(headers, supabase, currentUser)
    ])

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        salary_components: JSON.parse(components.body),
        salary_slips: JSON.parse(slips.body),
        fixed_deductions: JSON.parse(deductions.body)
      })
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Create salary data
async function handleCreateSalaryData(event, headers, supabase, currentUser) {
  try {
    const { action, ...data } = JSON.parse(event.body)

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action is required' })
      }
    }

    switch (action) {
      case 'generate_slip':
        return await generateSalarySlip(data, headers, supabase, currentUser)
      case 'add_component':
        return await addSalaryComponent(data, headers, supabase, currentUser)
      case 'add_deduction':
        return await addFixedDeduction(data, headers, supabase, currentUser)
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        }
    }

  } catch (error) {
    console.error('Create salary data error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Generate salary slip
async function generateSalarySlip(data, headers, supabase, currentUser) {
  try {
    const { employee_id, month, year, basic_salary, allowances, deductions } = data

    if (!employee_id || !month || !year || !basic_salary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // Calculate total salary
    const totalAllowances = allowances ? Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0) : 0
    const totalDeductions = deductions ? Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0) : 0
    const netSalary = basic_salary + totalAllowances - totalDeductions

    // Create salary slip
    const { data: slip, error } = await supabase
      .from('salary_slips')
      .insert([{
        employee_id,
        month,
        year,
        basic_salary,
        allowances: allowances || {},
        deductions: deductions || {},
        net_salary: netSalary,
        company_id: currentUser.company_id,
        created_by: currentUser.id
      }])
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create salary slip' })
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Salary slip generated successfully',
        salary_slip: slip
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Add salary component
async function addSalaryComponent(data, headers, supabase, currentUser) {
  try {
    const { name, type, value, description } = data

    if (!name || !type || !value) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    const { data: component, error } = await supabase
      .from('salary_components')
      .insert([{
        name,
        type,
        value,
        description,
        company_id: currentUser.company_id,
        created_by: currentUser.id
      }])
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create salary component' })
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Salary component added successfully',
        component
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Add fixed deduction
async function addFixedDeduction(data, headers, supabase, currentUser) {
  try {
    const { employee_id, name, amount, description } = data

    if (!employee_id || !name || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    const { data: deduction, error } = await supabase
      .from('fixed_deductions')
      .insert([{
        employee_id,
        name,
        amount,
        description,
        company_id: currentUser.company_id,
        created_by: currentUser.id
      }])
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create fixed deduction' })
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Fixed deduction added successfully',
        deduction
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Update salary data
async function handleUpdateSalaryData(event, headers, supabase, currentUser) {
  try {
    const { action, ...data } = JSON.parse(event.body)

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action is required' })
      }
    }

    switch (action) {
      case 'update_slip':
        return await updateSalarySlip(data, headers, supabase, currentUser)
      case 'update_component':
        return await updateSalaryComponent(data, headers, supabase, currentUser)
      case 'update_deduction':
        return await updateFixedDeduction(data, headers, supabase, currentUser)
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        }
    }

  } catch (error) {
    console.error('Update salary data error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Update salary slip
async function updateSalarySlip(data, headers, supabase, currentUser) {
  try {
    const { id, basic_salary, allowances, deductions } = data

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Slip ID is required' })
      }
    }

    // Calculate new net salary
    const totalAllowances = allowances ? Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0) : 0
    const totalDeductions = deductions ? Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0) : 0
    const netSalary = basic_salary + totalAllowances - totalDeductions

    const { data: updatedSlip, error } = await supabase
      .from('salary_slips')
      .update({
        basic_salary,
        allowances: allowances || {},
        deductions: deductions || {},
        net_salary: netSalary,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update salary slip' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Salary slip updated successfully',
        salary_slip: updatedSlip
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Update salary component
async function updateSalaryComponent(data, headers, supabase, currentUser) {
  try {
    const { id, name, type, value, description } = data

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Component ID is required' })
      }
    }

    const { data: updatedComponent, error } = await supabase
      .from('salary_components')
      .update({
        name,
        type,
        value,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update salary component' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Salary component updated successfully',
        component: updatedComponent
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Update fixed deduction
async function updateFixedDeduction(data, headers, supabase, currentUser) {
  try {
    const { id, name, amount, description } = data

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Deduction ID is required' })
      }
    }

    const { data: updatedDeduction, error } = await supabase
      .from('fixed_deductions')
      .update({
        name,
        amount,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update fixed deduction' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Fixed deduction updated successfully',
        deduction: updatedDeduction
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Delete salary data
async function handleDeleteSalaryData(event, headers, supabase, currentUser) {
  try {
    const { action, ...data } = JSON.parse(event.body)

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action is required' })
      }
    }

    switch (action) {
      case 'delete_slip':
        return await deleteSalarySlip(data, headers, supabase, currentUser)
      case 'delete_component':
        return await deleteSalaryComponent(data, headers, supabase, currentUser)
      case 'delete_deduction':
        return await deleteFixedDeduction(data, headers, supabase, currentUser)
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        }
    }

  } catch (error) {
    console.error('Delete salary data error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Delete salary slip
async function deleteSalarySlip(data, headers, supabase, currentUser) {
  try {
    const { id } = data

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Slip ID is required' })
      }
    }

    const { error } = await supabase
      .from('salary_slips')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUser.company_id)

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete salary slip' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Salary slip deleted successfully'
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Delete salary component
async function deleteSalaryComponent(data, headers, supabase, currentUser) {
  try {
    const { id } = data

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Component ID is required' })
      }
    }

    const { error } = await supabase
      .from('salary_components')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUser.company_id)

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete salary component' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Salary component deleted successfully'
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Delete fixed deduction
async function deleteFixedDeduction(data, headers, supabase, currentUser) {
  try {
    const { id } = data

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Deduction ID is required' })
      }
    }

    const { error } = await supabase
      .from('fixed_deductions')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUser.company_id)

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete fixed deduction' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Fixed deduction deleted successfully'
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
