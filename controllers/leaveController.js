const { supabase } = require('../config/supabase')

// Get leave types for the company
const getLeaveTypes = async (req, res) => {
  try {
    const { data: leaveTypes, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', req.user.company_id)
      .eq('is_active', true)
      .order('name')

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leave types' })
    }

    res.json({ leaveTypes })
  } catch (error) {
    console.error('Get leave types error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get leave balance for employee
const getLeaveBalance = async (req, res) => {
  try {
    const { employee_id } = req.params
    const currentYear = new Date().getFullYear()

    // Get leave balances for the employee
    const { data: balances, error } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_types (
          id,
          name,
          description,
          is_paid
        )
      `)
      .eq('employee_id', employee_id)
      .eq('year', currentYear)

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leave balance' })
    }

    res.json({ balances })
  } catch (error) {
    console.error('Get leave balance error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create leave request
const createLeaveRequest = async (req, res) => {
  try {
    const { leave_type_id, start_date, end_date, reason } = req.body

    // Validate required fields
    if (!leave_type_id || !start_date || !end_date || !reason) {
      return res.status(400).json({ 
        error: 'Leave type, start date, end date, and reason are required' 
      })
    }

    // Validate dates
    const start = new Date(start_date)
    const end = new Date(end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (start < today) {
      return res.status(400).json({ 
        error: 'Start date cannot be in the past' 
      })
    }

    if (end < start) {
      return res.status(400).json({ 
        error: 'End date cannot be before start date' 
      })
    }

    // Calculate total days (excluding weekends)
    const totalDays = calculateWorkingDays(start, end)

    // Check leave balance
    const currentYear = new Date().getFullYear()
    const { data: balance, error: balanceError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('leave_type_id', leave_type_id)
      .eq('year', currentYear)
      .single()

    if (balanceError && balanceError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to check leave balance' })
    }

    // Get leave type details
    const { data: leaveType, error: leaveTypeError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('id', leave_type_id)
      .single()

    if (leaveTypeError) {
      return res.status(400).json({ error: 'Invalid leave type' })
    }

    // Check if employee has enough balance (for paid leaves)
    if (leaveType.is_paid && balance && balance.remaining_days < totalDays) {
      return res.status(400).json({ 
        error: `Insufficient leave balance. You have ${balance.remaining_days} days remaining but requesting ${totalDays} days.` 
      })
    }

    // Create leave request
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: req.user.id,
        leave_type_id,
        start_date,
        end_date,
        total_days: totalDays,
        reason: reason.trim()
      })
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to create leave request' })
    }

    res.status(201).json({ 
      message: 'Leave request created successfully',
      leaveRequest 
    })

  } catch (error) {
    console.error('Create leave request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get leave requests (for employee or HR)
const getLeaveRequests = async (req, res) => {
  try {
    const { status, employee_id } = req.query
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (
          id,
          name,
          description,
          is_paid
        ),
        employees:users!leave_requests_employee_id_fkey (
          id,
          full_name,
          email
        ),
        approved_by_user:users!leave_requests_approved_by_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by employee (for employees) or company (for HR)
    if (req.user.role === 'employee') {
      query = query.eq('employee_id', req.user.id)
    } else if (req.user.role === 'hr' && employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: leaveRequests, error } = await query

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leave requests' })
    }

    res.json({ leaveRequests })
  } catch (error) {
    console.error('Get leave requests error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update leave request status (HR only)
const updateLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { status, hr_remarks } = req.body

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be either approved or rejected' 
      })
    }

    // Get the leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' })
    }

    // Check if already processed
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Leave request has already been processed' 
      })
    }

    // Update the leave request
    const updateData = {
      status,
      hr_remarks: hr_remarks?.trim(),
      approved_at: new Date().toISOString(),
      approved_by: req.user.id
    }

    const { data: updatedRequest, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to update leave request' })
    }

    // If approved, update leave balance
    if (status === 'approved') {
      await updateLeaveBalance(leaveRequest.employee_id, leaveRequest.leave_type_id, leaveRequest.total_days)
    }

    res.json({ 
      message: `Leave request ${status} successfully`,
      leaveRequest: updatedRequest 
    })

  } catch (error) {
    console.error('Update leave request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get leave history
const getLeaveHistory = async (req, res) => {
  try {
    const { employee_id } = req.params

    const { data: history, error } = await supabase
      .from('leave_history')
      .select(`
        *,
        leave_requests (
          id,
          start_date,
          end_date,
          total_days,
          reason,
          leave_types (
            name
          )
        ),
        action_by_user:users!leave_history_action_by_fkey (
          id,
          full_name
        )
      `)
      .eq('employee_id', employee_id)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leave history' })
    }

    res.json({ history })
  } catch (error) {
    console.error('Get leave history error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get unpaid leave days for salary calculation
const getUnpaidLeaveDays = async (req, res) => {
  try {
    const { employee_id, month, year } = req.query

    if (!employee_id || !month || !year) {
      return res.status(400).json({ 
        error: 'Employee ID, month, and year are required' 
      })
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const { data: unpaidLeaves, error } = await supabase
      .from('leave_requests')
      .select(`
        total_days,
        leave_types (
          is_paid
        )
      `)
      .eq('employee_id', employee_id)
      .eq('status', 'approved')
      .gte('start_date', startDate.toISOString().split('T')[0])
      .lte('end_date', endDate.toISOString().split('T')[0])
      .eq('leave_types.is_paid', false)

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch unpaid leave days' })
    }

    const totalUnpaidDays = unpaidLeaves.reduce((sum, leave) => sum + parseFloat(leave.total_days), 0)

    res.json({ 
      unpaidLeaves,
      totalUnpaidDays 
    })

  } catch (error) {
    console.error('Get unpaid leave days error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper function to calculate working days (excluding weekends)
const calculateWorkingDays = (startDate, endDate) => {
  let workingDays = 0
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++
    }
    current.setDate(current.getDate() + 1)
  }

  return workingDays
}

// Helper function to update leave balance
const updateLeaveBalance = async (employeeId, leaveTypeId, usedDays) => {
  try {
    const currentYear = new Date().getFullYear()

    // Get current balance
    const { data: balance, error: fetchError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', currentYear)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error('Failed to fetch leave balance')
    }

    if (balance) {
      // Update existing balance
      const { error: updateError } = await supabase
        .from('leave_balances')
        .update({
          used_days: balance.used_days + usedDays
        })
        .eq('id', balance.id)

      if (updateError) {
        throw new Error('Failed to update leave balance')
      }
    } else {
      // Create new balance record
      const { error: insertError } = await supabase
        .from('leave_balances')
        .insert({
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          year: currentYear,
          total_days: 0,
          used_days: usedDays
        })

      if (insertError) {
        throw new Error('Failed to create leave balance')
      }
    }
  } catch (error) {
    console.error('Update leave balance error:', error)
    throw error
  }
}

module.exports = {
  getLeaveTypes,
  getLeaveBalance,
  createLeaveRequest,
  getLeaveRequests,
  updateLeaveRequest,
  getLeaveHistory,
  getUnpaidLeaveDays
} 