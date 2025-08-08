const { supabase, supabaseAdmin } = require('../config/supabase')
const emailService = require('../utils/emailService')
const { calculateLeaveDays } = require('../utils/workingDaysCalculator')

// Get leave types
const getLeaveTypes = async (req, res) => {
  try {
    // Try to fetch from database first using admin client to bypass RLS
    const { data: dbLeaveTypes, error } = await supabaseAdmin
      .from('leave_types')
      .select('*')
      .order('name')
    
    if (!error && dbLeaveTypes && dbLeaveTypes.length > 0) {
      // Remove duplicates by name and add max_days for compatibility with frontend
      const uniqueTypes = []
      const seenNames = new Set()
      
      dbLeaveTypes.forEach(type => {
        if (!seenNames.has(type.name)) {
          seenNames.add(type.name)
          uniqueTypes.push({
            ...type,
            max_days: type.name === 'Annual Leave' ? 20 : 
                      type.name === 'Sick Leave' ? 10 : 
                      type.name === 'Personal Leave' ? 5 : 10
          })
        }
      })
      
      return res.json(uniqueTypes)
    }
    
    // Fallback to hardcoded types if database is empty
    const fallbackTypes = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Annual Leave',
        description: 'Regular annual leave with full pay',
        is_paid: true,
        max_days: 20
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Sick Leave',
        description: 'Medical leave with full pay',
        is_paid: true,
        max_days: 10
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Personal Leave',
        description: 'Personal leave without pay',
        is_paid: false,
        max_days: 5
      }
    ]
    
    res.json(fallbackTypes)
  } catch (error) {
    console.error('Get leave types error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get leave balance for employee
const getLeaveBalance = async (req, res) => {
  try {
    const { employee_id } = req.params
    const currentUser = req.user

    // Determine which employee to get balance for
    let targetEmployeeId = employee_id
    
    if (!targetEmployeeId) {
      // If no employee_id provided, get current user's employee record
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', currentUser.id)
        .single()

      if (empError || !employee) {
        return res.status(404).json({ error: 'Employee record not found' })
      }
      targetEmployeeId = employee.id
    }

    // Get employee's current leave balance
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('leave_balance, company_id')
      .eq('id', targetEmployeeId)
      .single()

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Apply company isolation for non-admin users
    if (currentUser.role !== 'admin' && employee.company_id !== currentUser.company_id) {
      return res.status(403).json({ error: 'Access denied to this employee' })
    }

    // Get all leave types
    const { data: leaveTypes, error: typesError } = await supabaseAdmin
      .from('leave_types')
      .select('id, name, description, is_paid')
      .order('name')

    if (typesError) {
      console.error('Error fetching leave types:', typesError)
      return res.status(500).json({ error: 'Failed to fetch leave types' })
    }

    // Calculate used days for each leave type
    const currentYear = new Date().getFullYear()
    const balances = []

    for (const leaveType of leaveTypes) {
      // Get approved leave requests for this type in current year
      const { data: usedLeaves, error: usedError } = await supabase
        .from('leave_requests')
        .select('total_days')
        .eq('employee_id', targetEmployeeId)
        .eq('leave_type_id', leaveType.id)
        .eq('status', 'approved_by_hr')
        .gte('start_date', `${currentYear}-01-01`)
        .lte('end_date', `${currentYear}-12-31`)

      if (usedError) {
        console.error(`Error fetching used leaves for ${leaveType.name}:`, usedError)
        continue
      }

      const usedDays = usedLeaves?.reduce((sum, leave) => sum + (leave.total_days || 0), 0) || 0
      
      // For paid leave types, use the employee's leave balance
      // For unpaid leave types, show unlimited or fixed allocation
      let totalDays, remainingDays
      
      if (leaveType.is_paid) {
        // For paid leaves, use employee's leave balance as total
        totalDays = employee.leave_balance + usedDays
        remainingDays = employee.leave_balance
      } else {
        // For unpaid leaves, show unlimited or fixed allocation
        totalDays = leaveType.name === 'Personal Leave' ? 5 : 10
        remainingDays = Math.max(0, totalDays - usedDays)
      }

      balances.push({
        leave_type_id: leaveType.id,
        leave_type_name: leaveType.name,
        total_days: totalDays,
        used_days: usedDays,
        remaining_days: remainingDays,
        is_paid: leaveType.is_paid
      })
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
    const { leave_type_id, start_date, end_date, reason, employee_id } = req.body
    const currentUser = req.user

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

    // Get employee details
    let employee = null
    if (['hr', 'hr_manager', 'admin'].includes(currentUser.role)) {
      // HR users can create leave requests for any employee
      if (!employee_id) {
        return res.status(400).json({ 
          error: 'Employee ID is required for HR users' 
        })
      }
      
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id, team_lead_id, created_by')
        .eq('id', employee_id)
        .single()
      
      if (empErr || !empData) {
        return res.status(400).json({ error: 'Employee not found' })
      }
      employee = empData
    } else {
      // Regular employees can only create leave requests for themselves
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id, team_lead_id, created_by')
        .eq('user_id', currentUser.id)
        .single()
      
      if (empErr || !empData) {
        return res.status(400).json({ error: 'Employee not found' })
      }
      employee = empData
    }

    // Get employee's company_id for isolation
    const { data: employeeWithCompany, error: companyError } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employee.id)
      .single()

    if (companyError || !employeeWithCompany) {
      return res.status(400).json({ error: 'Employee company not found' })
    }

    // Calculate total days (respecting company working days configuration)
    const totalDays = await calculateLeaveDays(employeeWithCompany.company_id, start, end)

    // Validate leave type exists using admin client to bypass RLS
    const { data: leaveType, error: leaveTypeError } = await supabaseAdmin
      .from('leave_types')
      .select('id, name')
      .eq('id', leave_type_id)
      .single()

    if (leaveTypeError || !leaveType) {
      return res.status(400).json({ 
        error: 'Invalid leave type. Please select a valid leave type.' 
      })
    }

    // Create leave request with company_id
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employee.id,
        leave_type_id,
        start_date,
        end_date,
        total_days: totalDays,
        reason: reason.trim(),
        status: 'pending',
        team_lead_id: employee.team_lead_id,
        hr_id: employee.created_by,
        company_id: employeeWithCompany.company_id
      })
      .select('*')
      .single()

    if (error) {
      console.error('Create leave request error:', error)
      return res.status(500).json({ error: 'Failed to create leave request' })
    }

    // Send email notification to HR
    try {
      const hrEmails = await emailService.getHREmails(employeeWithCompany.company_id)
      if (hrEmails.length > 0) {
        await emailService.sendLeaveRequestNotification(leaveRequest, hrEmails)
        console.log('✅ Email notification sent to HR:', hrEmails)
      } else {
        console.log('⚠️ No HR emails found for company:', employeeWithCompany.company_id)
      }
    } catch (emailError) {
      console.log('Email notification failed, but leave request created successfully:', emailError.message)
    }

    res.status(201).json({ 
      message: 'Leave request created successfully. Pending approval.',
      leaveRequest 
    })

  } catch (error) {
    console.error('Create leave request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get leave requests
const getLeaveRequests = async (req, res) => {
  try {
    const { status, employee_id } = req.query
    const currentUser = req.user
    
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employees (
          id,
          full_name,
          email,
          company_id
        ),
        leave_types (
          id,
          name,
          description
        )
      `)
      .order('created_at', { ascending: false })

    // Apply company isolation based on user role
    if (currentUser.role === 'employee') {
      // Get employee ID for the current user
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', currentUser.id)
        .single()

      if (empError || !employee) {
        return res.status(404).json({ error: 'Employee record not found' })
      }

      query = query.eq('employee_id', employee.id)
    } else if (['hr', 'hr_manager', 'admin'].includes(currentUser.role)) {
      // For HR users, filter by company_id to ensure isolation
      if (currentUser.role === 'admin') {
        // Admin can see all leave requests (no additional filter)
      } else {
        // HR and HR Manager can only see leave requests from their company
        query = query.eq('company_id', currentUser.company_id)
        
        // If specific employee is requested, verify they belong to the same company
        if (employee_id) {
          const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('company_id')
            .eq('id', employee_id)
            .single()

          if (empError || !employee || employee.company_id !== currentUser.company_id) {
            return res.status(403).json({ error: 'Access denied to this employee' })
          }
          
          query = query.eq('employee_id', employee_id)
        }
      }
    } else {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: leaveRequests, error } = await query

    if (error) {
      console.error('Get leave requests error:', error)
      return res.status(500).json({ error: 'Failed to fetch leave requests' })
    }

    res.json(leaveRequests || [])
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

    // Validate status for HR approval
    if (!['approved_by_hr', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be either approved_by_hr or rejected' 
      })
    }

    // Get the leave request with company isolation
    let query = supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)

    // Apply company isolation for non-admin users
    if (req.user.role !== 'admin') {
      query = query.eq('company_id', req.user.company_id)
    }

    const { data: leaveRequest, error: fetchError } = await query.single()

    if (fetchError || !leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found or access denied' })
    }

    // Check if already processed by HR
    if (leaveRequest.status === 'approved_by_hr' || leaveRequest.status === 'rejected') {
      return res.status(400).json({ 
        error: 'Leave request has already been processed by HR' 
      })
    }

    // Update the leave request
    const updateData = {
      status,
      hr_remarks: hr_remarks?.trim() || null,
      approved_at: new Date().toISOString(),
      approved_by: req.user.id
    }

    const { data: updatedRequest, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employees (
          id,
          full_name,
          email,
          leave_balance
        ),
        leave_types (
          id,
          name,
          is_paid
        )
      `)
      .single()

    if (error) {
      console.error('Update leave request error:', error)
      return res.status(500).json({ error: 'Failed to update leave request' })
    }

    // If approved, deduct leave balance for paid leave types
    if (status === 'approved_by_hr' && updatedRequest.leave_types?.is_paid) {
      try {
        const currentBalance = updatedRequest.employees.leave_balance || 0
        const leaveDays = updatedRequest.total_days || 0
        const newBalance = Math.max(0, currentBalance - leaveDays)

        // Update employee's leave balance
        const { error: balanceError } = await supabase
          .from('employees')
          .update({ leave_balance: newBalance })
          .eq('id', updatedRequest.employee_id)

        if (balanceError) {
          console.error('Failed to update leave balance:', balanceError)
          // Don't fail the request, just log the error
        } else {
          console.log(`✅ Leave balance updated for employee ${updatedRequest.employees.full_name}: ${currentBalance} → ${newBalance} (deducted ${leaveDays} days)`)
        }
      } catch (balanceError) {
        console.error('Error updating leave balance:', balanceError)
        // Don't fail the request, just log the error
      }
    }

    // Send email notification to employee
    try {
      await emailService.sendLeaveStatusUpdate(updatedRequest)
    } catch (emailError) {
      console.log('Email notification failed, but leave request updated successfully:', emailError.message)
    }

    res.json({ 
      message: `Leave request ${status === 'approved_by_hr' ? 'approved' : 'rejected'} successfully`,
      leaveRequest: updatedRequest 
    })

  } catch (error) {
    console.error('Update leave request error:', error)
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

    // Get unpaid leave requests for the month
    const { data: unpaidLeaves, error } = await supabase
      .from('leave_requests')
      .select('total_days, leave_type_id')
      .eq('employee_id', employee_id)
      .eq('status', 'approved_by_hr')
      .gte('start_date', startDate.toISOString().split('T')[0])
      .lte('end_date', endDate.toISOString().split('T')[0])
      .in('leave_type_id', ['550e8400-e29b-41d4-a716-446655440003']) // Only personal leave is unpaid

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch unpaid leave days' })
    }

    const totalUnpaidDays = unpaidLeaves.reduce((sum, leave) => sum + parseInt(leave.total_days), 0)

    res.json({ 
      unpaidLeaves,
      totalUnpaidDays 
    })

  } catch (error) {
    console.error('Get unpaid leave days error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  getLeaveTypes,
  getLeaveBalance,
  createLeaveRequest,
  getLeaveRequests,
  updateLeaveRequest,
  getUnpaidLeaveDays
} 