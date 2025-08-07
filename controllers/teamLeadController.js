const { supabase, supabaseAdmin } = require('../config/supabase');

// Get team members (Team Lead only)
const getTeamMembers = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only team leads can access team members' });
    }

    const { data: teamMembers, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        users!inner(full_name, email, role, company_id)
      `)
      .eq('team_lead_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ teamMembers });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get team lead's pending leave requests
const getPendingLeaveRequests = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only team leads can access leave requests' });
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
      .order('applied_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ leaveRequests });
  } catch (error) {
    console.error('Get pending leave requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve/Reject leave request (Team Lead)
const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'approve' or 'reject'
    const currentUser = req.user;

    if (currentUser.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only team leads can approve leave requests' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "approve" or "reject"' });
    }

    // Get the leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .eq('team_lead_id', currentUser.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found or not pending' });
    }

    // Update the leave request
    const updateData = {
      team_lead_comment: comment || null,
      team_lead_approved_at: new Date().toISOString(),
      status: action === 'approve' ? 'approved_by_team_lead' : 'rejected',
      updated_at: new Date().toISOString()
    };

    const { data: updatedRequest, error: updateError } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Send notification to employee and HR
    try {
      // You can implement email notifications here
      console.log(`Leave request ${action}ed by team lead for employee ${leaveRequest.employee_id}`);
    } catch (notificationError) {
      console.log('Notification failed, but leave request updated successfully');
    }

    res.json({ 
      message: `Leave request ${action}ed successfully`,
      leaveRequest: updatedRequest 
    });
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get team lead dashboard stats
const getTeamLeadDashboard = async (req, res) => {
  try {
    const currentUser = req.user;

    if (currentUser.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only team leads can access dashboard' });
    }

    // Get team member count
    const { count: teamMemberCount, error: countError } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('team_lead_id', currentUser.id);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    // Get pending leave requests count
    const { count: pendingLeavesCount, error: leavesError } = await supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('team_lead_id', currentUser.id)
      .eq('status', 'pending');

    if (leavesError) {
      return res.status(500).json({ error: leavesError.message });
    }

    // Get recent leave requests
    const { data: recentLeaves, error: recentError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!inner(full_name, email, department)
      `)
      .eq('team_lead_id', currentUser.id)
      .order('applied_at', { ascending: false })
      .limit(5);

    if (recentError) {
      return res.status(500).json({ error: recentError.message });
    }

    res.json({
      dashboard: {
        teamMemberCount,
        pendingLeavesCount,
        recentLeaves
      }
    });
  } catch (error) {
    console.error('Get team lead dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTeamMembers,
  getPendingLeaveRequests,
  approveLeaveRequest,
  getTeamLeadDashboard
}; 