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
        return await handleGetLeaveData(event, headers, supabase, currentUser)
      case 'POST':
        return await handleCreateLeaveRequest(event, headers, supabase, currentUser)
      case 'PUT':
        return await handleUpdateLeaveRequest(event, headers, supabase, currentUser)
      case 'DELETE':
        return await handleDeleteLeaveRequest(event, headers, supabase, currentUser)
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

  } catch (error) {
    console.error('Leave Management API error:', error)
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

// Get leave data (requests, balances, types)
async function handleGetLeaveData(event, headers, supabase, currentUser) {
  try {
    const { type, employee_id, status, start_date, end_date } = event.queryStringParameters || {}
    
    // Handle different types of leave data requests
    if (type === 'types') {
      return await getLeaveTypes(headers, supabase, currentUser)
    } else if (type === 'balance') {
      return await getLeaveBalance(headers, supabase, currentUser, employee_id)
    } else if (type === 'requests') {
      return await getLeaveRequests(headers, supabase, currentUser, { employee_id, status, start_date, end_date })
    } else if (type === 'summary') {
      return await getLeaveSummary(headers, supabase, currentUser)
    } else {
      // Default: return all leave data
      return await getAllLeaveData(headers, supabase, currentUser)
    }

  } catch (error) {
    console.error('Get leave data error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get leave types
async function getLeaveTypes(headers, supabase, currentUser) {
  try {
    const { data: leaveTypes, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('name', { ascending: true })

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch leave types' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(leaveTypes)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get leave balance for an employee
async function getLeaveBalance(headers, supabase, currentUser, employeeId) {
  try {
    const targetEmployeeId = employeeId || currentUser.id

    const { data: leaveBalance, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', targetEmployeeId)
      .eq('company_id', currentUser.company_id)

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch leave balance' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(leaveBalance)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get leave requests
async function getLeaveRequests(headers, supabase, currentUser, filters) {
  try {
    let query = supabase
      .from('leave_requests')
      .select('*')
      .eq('company_id', currentUser.company_id)

    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.start_date) {
      query = query.gte('start_date', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('end_date', filters.end_date)
    }

    const { data: leaveRequests, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch leave requests' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(leaveRequests)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get leave summary
async function getLeaveSummary(headers, supabase, currentUser) {
  try {
    const { data: summary, error } = await supabase
      .from('leave_requests')
      .select('status, count')
      .eq('company_id', currentUser.company_id)
      .group('status')

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch leave summary' })
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

// Get all leave data
async function getAllLeaveData(headers, supabase, currentUser) {
  try {
    const [leaveTypes, leaveBalance, leaveRequests] = await Promise.all([
      getLeaveTypes(headers, supabase, currentUser),
      getLeaveBalance(headers, supabase, currentUser),
      getLeaveRequests(headers, supabase, currentUser, {})
    ])

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        leave_types: JSON.parse(leaveTypes.body),
        leave_balance: JSON.parse(leaveBalance.body),
        leave_requests: JSON.parse(leaveRequests.body)
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

// Create leave request
async function handleCreateLeaveRequest(event, headers, supabase, currentUser) {
  try {
    const { employee_id, leave_type_id, start_date, end_date, reason, half_day, half_day_type } = JSON.parse(event.body)

    // Validation
    if (!employee_id || !leave_type_id || !start_date || !end_date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // Check if dates are valid
    const start = new Date(start_date)
    const end = new Date(end_date)
    if (start > end) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Start date cannot be after end date' })
      }
    }

    // Calculate working days
    const workingDays = calculateWorkingDays(start_date, end_date, half_day, half_day_type)

    // Create leave request
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        reason,
        working_days: workingDays,
        status: 'pending',
        company_id: currentUser.company_id,
        created_by: currentUser.id
      }])
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create leave request' })
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Leave request created successfully',
        leave_request: leaveRequest
      })
    }

  } catch (error) {
    console.error('Create leave request error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Update leave request
async function handleUpdateLeaveRequest(event, headers, supabase, currentUser) {
  try {
    const { id, status, approved_by, comments } = JSON.parse(event.body)

    if (!id || !status) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Leave request ID and status are required' })
      }
    }

    // Check if user has permission to approve/reject
    if (['approved', 'rejected'].includes(status) && !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only HR staff can approve/reject leave requests' })
      }
    }

    // Update leave request
    const { data: updatedRequest, error } = await supabase
      .from('leave_requests')
      .update({
        status,
        approved_by: status !== 'pending' ? currentUser.id : null,
        approved_at: status !== 'pending' ? new Date().toISOString() : null,
        comments: comments || null
      })
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update leave request' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Leave request updated successfully',
        leave_request: updatedRequest
      })
    }

  } catch (error) {
    console.error('Update leave request error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Delete leave request
async function handleDeleteLeaveRequest(event, headers, supabase, currentUser) {
  try {
    const { id } = JSON.parse(event.body)

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Leave request ID is required' })
      }
    }

    // Check if user can delete this request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !leaveRequest) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Leave request not found' })
      }
    }

    // Only allow deletion if request is pending or user is HR staff
    if (leaveRequest.status !== 'pending' && !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Cannot delete approved/rejected leave requests' })
      }
    }

    // Delete leave request
    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUser.company_id)

    if (deleteError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete leave request' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Leave request deleted successfully'
      })
    }

  } catch (error) {
    console.error('Delete leave request error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Helper function to calculate working days
function calculateWorkingDays(startDate, endDate, halfDay = false, halfDayType = null) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  let workingDays = 0
  const current = new Date(start)
  
  while (current <= end) {
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      workingDays++
    }
    current.setDate(current.getDate() + 1)
  }
  
  // Handle half days
  if (halfDay && halfDayType === 'start' && start.getDay() !== 0 && start.getDay() !== 6) {
    workingDays -= 0.5
  } else if (halfDay && halfDayType === 'end' && end.getDay() !== 0 && end.getDay() !== 6) {
    workingDays -= 0.5
  }
  
  return Math.max(0, workingDays)
}
