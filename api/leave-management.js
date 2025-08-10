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
        return await handleGetLeaveData(req, res, supabase, currentUser)
      case 'POST':
        return await handleCreateLeaveRequest(req, res, supabase, currentUser)
      case 'PUT':
        return await handleUpdateLeaveRequest(req, res, supabase, currentUser)
      case 'DELETE':
        return await handleDeleteLeaveRequest(req, res, supabase, currentUser)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Leave Management API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

// Get leave data (requests, balances, types)
async function handleGetLeaveData(req, res, supabase, currentUser) {
  try {
    const { type, employee_id, status, start_date, end_date } = req.query
    
    // Handle different types of leave data requests
    if (type === 'types') {
      return await getLeaveTypes(res, supabase, currentUser)
    } else if (type === 'balance') {
      return await getLeaveBalance(res, supabase, currentUser, employee_id)
    } else if (type === 'requests') {
      return await getLeaveRequests(res, supabase, currentUser, { employee_id, status, start_date, end_date })
    } else if (type === 'summary') {
      return await getLeaveSummary(res, supabase, currentUser)
    } else {
      // Default: return all leave data
      return await getAllLeaveData(res, supabase, currentUser)
    }

  } catch (error) {
    console.error('Get leave data error:', error)
    return res.status(500).json({ error: 'Failed to fetch leave data' })
  }
}

// Get leave types
async function getLeaveTypes(res, supabase, currentUser) {
  try {
    const { data: leaveTypes, error } = await supabase
      .from('leave_types')
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
      leave_types: leaveTypes || [],
      total: leaveTypes?.length || 0
    })

  } catch (error) {
    console.error('Get leave types error:', error)
    return res.status(500).json({ error: 'Failed to fetch leave types' })
  }
}

// Get leave balance for employee
async function getLeaveBalance(res, supabase, currentUser, employeeId) {
  try {
    const targetEmployeeId = employeeId || currentUser.id

    // Check if user has permission to view other employee's balance
    if (employeeId && employeeId !== currentUser.id && 
        !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'You can only view your own leave balance' })
    }

    // Get employee's leave balance
    const { data: leaveBalance, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', targetEmployeeId)
      .eq('company_id', currentUser.company_id)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({
      success: true,
      employee_id: targetEmployeeId,
      leave_balance: leaveBalance || [],
      total: leaveBalance?.length || 0
    })

  } catch (error) {
    console.error('Get leave balance error:', error)
    return res.status(500).json({ error: 'Failed to fetch leave balance' })
  }
}

// Get leave requests
async function getLeaveRequests(res, supabase, currentUser, filters) {
  try {
    const { employee_id, status, start_date, end_date } = filters
    
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        users!inner(full_name, email),
        leave_types!inner(name, color)
      `)
      .eq('company_id', currentUser.company_id)

    // Apply filters
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (start_date) {
      query = query.gte('start_date', start_date)
    }
    if (end_date) {
      query = query.lte('end_date', end_date)
    }

    // If user is not HR, only show their own requests
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      query = query.eq('employee_id', currentUser.id)
    }

    const { data: leaveRequests, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({
      success: true,
      leave_requests: leaveRequests || [],
      total: leaveRequests?.length || 0
    })

  } catch (error) {
    console.error('Get leave requests error:', error)
    return res.status(500).json({ error: 'Failed to fetch leave requests' })
  }
}

// Get leave summary
async function getLeaveSummary(res, supabase, currentUser) {
  try {
    // Get summary statistics
    const { data: summary, error } = await supabase
      .from('leave_requests')
      .select('status, leave_type_id')
      .eq('company_id', currentUser.company_id)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    // Calculate summary
    const summaryData = {
      total_requests: summary?.length || 0,
      pending: summary?.filter(r => r.status === 'pending').length || 0,
      approved: summary?.filter(r => r.status === 'approved').length || 0,
      rejected: summary?.filter(r => r.status === 'rejected').length || 0,
      cancelled: summary?.filter(r => r.status === 'cancelled').length || 0
    }

    res.status(200).json({
      success: true,
      summary: summaryData
    })

  } catch (error) {
    console.error('Get leave summary error:', error)
    return res.status(500).json({ error: 'Failed to fetch leave summary' })
  }
}

// Get all leave data
async function getAllLeaveData(res, supabase, currentUser) {
  try {
    // Get leave types, requests, and balance in parallel
    const [leaveTypesResult, leaveRequestsResult, leaveBalanceResult] = await Promise.all([
      supabase
        .from('leave_types')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .eq('is_active', true),
      supabase
        .from('leave_requests')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .eq('employee_id', currentUser.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', currentUser.id)
        .eq('company_id', currentUser.company_id)
    ])

    if (leaveTypesResult.error || leaveRequestsResult.error || leaveBalanceResult.error) {
      console.error('Database error:', leaveTypesResult.error || leaveRequestsResult.error || leaveBalanceResult.error)
      return res.status(500).json({ error: 'Failed to fetch leave data' })
    }

    res.status(200).json({
      success: true,
      leave_types: leaveTypesResult.data || [],
      leave_requests: leaveRequestsResult.data || [],
      leave_balance: leaveBalanceResult.data || [],
      summary: {
        total_requests: leaveRequestsResult.data?.length || 0,
        pending: leaveRequestsResult.data?.filter(r => r.status === 'pending').length || 0,
        approved: leaveRequestsResult.data?.filter(r => r.status === 'approved').length || 0,
        rejected: leaveRequestsResult.data?.filter(r => r.status === 'rejected').length || 0
      }
    })

  } catch (error) {
    console.error('Get all leave data error:', error)
    return res.status(500).json({ error: 'Failed to fetch leave data' })
  }
}

// Create leave request
async function handleCreateLeaveRequest(req, res, supabase, currentUser) {
  try {
    const {
      leave_type_id,
      start_date,
      end_date,
      reason,
      half_day = false,
      half_day_type = null
    } = req.body

    if (!leave_type_id || !start_date || !end_date || !reason) {
      return res.status(400).json({ 
        error: 'Leave type, start date, end date, and reason are required' 
      })
    }

    // Validate dates
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (startDate < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' })
    }

    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date cannot be before start date' })
    }

    // Check if leave type exists and belongs to the company
    const { data: leaveType, error: leaveTypeError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('id', leave_type_id)
      .eq('company_id', currentUser.company_id)
      .eq('is_active', true)
      .single()

    if (leaveTypeError || !leaveType) {
      return res.status(404).json({ error: 'Leave type not found or inactive' })
    }

    // Calculate number of days (excluding weekends)
    const workingDays = calculateWorkingDays(startDate, endDate, half_day, half_day_type)

    // Check leave balance
    const { data: leaveBalance, error: balanceError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', currentUser.id)
      .eq('leave_type_id', leave_type_id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (balanceError) {
      console.error('Balance check error:', balanceError)
      return res.status(500).json({ error: 'Failed to check leave balance' })
    }

    if (!leaveBalance || leaveBalance.remaining_days < workingDays) {
      return res.status(400).json({ 
        error: 'Insufficient leave balance',
        available: leaveBalance?.remaining_days || 0,
        requested: workingDays
      })
    }

    // Generate UUID for new leave request
    const { randomUUID } = require('crypto')
    const requestId = randomUUID()

    // Create leave request
    const { data: newRequest, error: createError } = await supabase
      .from('leave_requests')
      .insert([{
        id: requestId,
        employee_id: currentUser.id,
        leave_type_id,
        company_id: currentUser.company_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        reason,
        half_day,
        half_day_type,
        days_requested: workingDays,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (createError) {
      console.error('Leave request creation error:', createError)
      return res.status(500).json({ 
        error: 'Failed to create leave request',
        message: createError.message 
      })
    }

    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
      leave_request: {
        ...newRequest,
        leave_type_name: leaveType.name
      }
    })

  } catch (error) {
    console.error('Create leave request error:', error)
    return res.status(500).json({ error: 'Failed to create leave request' })
  }
}

// Update leave request (approve/reject/update)
async function handleUpdateLeaveRequest(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Leave request ID is required' })
    }

    const {
      status,
      reason,
      start_date,
      end_date,
      half_day,
      half_day_type,
      admin_notes
    } = req.body

    // Check if leave request exists and belongs to the company
    const { data: existingRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingRequest) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    // Check permissions
    if (status && !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can update leave request status' })
    }

    if (existingRequest.employee_id !== currentUser.id && 
        !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'You can only update your own leave requests' })
    }

    // Update leave request
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) updateData.status = status
    if (reason !== undefined) updateData.reason = reason
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (half_day !== undefined) updateData.half_day = half_day
    if (half_day_type !== undefined) updateData.half_day_type = half_day_type
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes

    // If dates changed, recalculate days
    if (start_date || end_date) {
      const startDate = new Date(start_date || existingRequest.start_date)
      const endDate = new Date(end_date || existingRequest.end_date)
      const workingDays = calculateWorkingDays(startDate, endDate, half_day || existingRequest.half_day, half_day_type || existingRequest.half_day_type)
      updateData.days_requested = workingDays
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Leave request update error:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update leave request',
        message: updateError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      leave_request: updatedRequest
    })

  } catch (error) {
    console.error('Update leave request error:', error)
    return res.status(500).json({ error: 'Failed to update leave request' })
  }
}

// Delete leave request
async function handleDeleteLeaveRequest(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Leave request ID is required' })
    }

    // Check if leave request exists and belongs to the company
    const { data: existingRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingRequest) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    // Check permissions - only HR or the request owner can delete
    if (existingRequest.employee_id !== currentUser.id && 
        !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'You can only delete your own leave requests' })
    }

    // Only allow deletion of pending requests
    if (existingRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending leave requests can be deleted' })
    }

    // Delete leave request
    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Leave request deletion error:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete leave request',
        message: deleteError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully',
      deleted_request: {
        id: existingRequest.id,
        start_date: existingRequest.start_date,
        end_date: existingRequest.end_date
      }
    })

  } catch (error) {
    console.error('Delete leave request error:', error)
    return res.status(500).json({ error: 'Failed to delete leave request' })
  }
}

// Helper function to calculate working days
function calculateWorkingDays(startDate, endDate, halfDay = false, halfDayType = null) {
  let days = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days++
    }
    current.setDate(current.getDate() + 1)
  }
  
  // Handle half day
  if (halfDay && halfDayType === 'start' && startDate.getTime() === endDate.getTime()) {
    days = 0.5
  } else if (halfDay && halfDayType === 'end' && startDate.getTime() === endDate.getTime()) {
    days = 0.5
  }
  
  return days
}
