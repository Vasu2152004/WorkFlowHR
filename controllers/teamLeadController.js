const { supabase, supabaseAdmin } = require('../config/supabase')

// Get team members for a team lead
const getTeamMembers = async (req, res) => {
  try {
    const currentUser = req.user

    if (currentUser.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only team leads can access team members' })
    }

    const { data: teamMembers, error } = await supabase
      .from('employees')
      .select('id, full_name, email, department, designation, created_at')
      .eq('team_lead_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ teamMembers })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get team lead's pending leave requests
const getPendingLeaveRequests = async (req, res) => {
  try {
    const currentUser = req.user

    if (currentUser.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only team leads can access leave requests' })
    }

    const { data: leaveRequests, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!inner(full_name, email, department, designation),
        team_lead:users!leave_requests_team_lead_id_fkey(full_name, email)
      `)
      .eq('team_lead_id', currentUser.id)
      .eq('status', 'pending')
      .order('applied_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ leaveRequests })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Approve/Reject leave request (Team Lead)
const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { action, comment } = req.body // action: 'approve' or 'reject'
    const currentUser = req.user

    if (currentUser.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only team leads can approve leave requests' })
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "approve" or "reject"' })
    }

    // Get the leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .eq('team_lead_id', currentUser.id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found or not pending' })
    }

    // Update the leave request
    const updateData = {
      team_lead_comment: comment || null,
      team_lead_approved_at: new Date().toISOString(),
      status: action === 'approve' ? 'approved_by_team_lead' : 'rejected',
      updated_at: new Date().toISOString()
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    // Send email notification to employee
    try {
      const emailService = require('../utils/emailService')
      await emailService.sendLeaveStatusUpdate(updatedRequest)
    } catch (emailError) {
      // Continue even if email fails
      console.log('Email notification failed, but leave request updated successfully:', emailError.message)
    }

    res.json({
      message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      leaveRequest: updatedRequest
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  getTeamMembers,
  getPendingLeaveRequests,
  approveLeaveRequest
}