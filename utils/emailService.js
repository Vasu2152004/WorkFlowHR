const nodemailer = require('nodemailer')
const { supabase, supabaseAdmin } = require('../config/supabase')

// Email configuration
let transporter = null
try {
  // Load environment variables
  require('dotenv').config()
  
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
         transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
    console.log('✅ Email transporter configured successfully')
  } else {
    console.log('⚠️ Email credentials not found in .env - email functionality disabled')
  }
} catch (error) {
  console.log('⚠️ Nodemailer configuration failed - email functionality disabled:', error.message)
}

// Email templates
const emailTemplates = {
  leaveRequestNotification: (employeeName, leaveType, startDate, endDate, totalDays, reason) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin-top: 0;">Leave Request Notification</h2>
        <p>A new leave request has been submitted and requires your attention.</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3 style="color: #1f2937; margin-top: 0;">Request Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Employee:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Leave Type:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Start Date:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(startDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>End Date:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(endDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Days:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${totalDays} days</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Reason:</strong></td>
            <td style="padding: 8px 0;">${reason}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>Action Required:</strong> Please review and approve/reject this leave request through the HRMS system.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
        <p>This is an automated notification from the HRMS system.</p>
      </div>
    </div>
  `,

  leaveStatusUpdate: (employeeName, leaveType, startDate, endDate, status, remarks) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: ${status === 'approved_by_hr' ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: ${status === 'approved_by_hr' ? '#16a34a' : '#dc2626'}; margin-top: 0;">
          Leave Request ${status === 'approved_by_hr' ? 'Approved' : 'Rejected'}
        </h2>
        <p>Your leave request has been ${status === 'approved_by_hr' ? 'approved' : 'rejected'} by HR.</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3 style="color: #1f2937; margin-top: 0;">Request Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Employee:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Leave Type:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Start Date:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(startDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>End Date:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(endDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Status:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: ${status === 'approved_by_hr' ? '#16a34a' : '#dc2626'}; font-weight: bold;">
                ${status === 'approved_by_hr' ? 'Approved' : 'Rejected'}
              </span>
            </td>
          </tr>
          ${remarks ? `
          <tr>
            <td style="padding: 8px 0;"><strong>Remarks:</strong></td>
            <td style="padding: 8px 0;">${remarks}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>Next Steps:</strong> You can view the complete details of your leave request in the HRMS system.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
        <p>This is an automated notification from the HRMS system.</p>
      </div>
    </div>
  `,

  salarySlipGenerated: (employeeName, month, year, netSalary, grossSalary, totalDeductions) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin-top: 0;">Salary Slip Generated</h2>
        <p>Your salary slip for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} has been generated.</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3 style="color: #1f2937; margin-top: 0;">Salary Summary:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Employee:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Month:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Gross Salary:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">₹${grossSalary.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Deductions:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">₹${totalDeductions.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Net Salary:</strong></td>
            <td style="padding: 8px 0; font-weight: bold; color: #16a34a;">₹${netSalary.toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>Access Your Salary Slip:</strong> You can view and download your complete salary slip from your employee dashboard in the HRMS system.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
        <p>This is an automated notification from the HRMS system.</p>
      </div>
    </div>
  `
}

// Email service functions
const emailService = {
  // Send email notification for new leave request
  async sendLeaveRequestNotification(leaveRequest, hrEmails) {
    if (!transporter) {
      console.log('⚠️ Email service not configured - skipping leave request notification')
      return false
    }

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('full_name, email')
        .eq('id', leaveRequest.employee_id)
        .single()

      const { data: leaveType } = await supabaseAdmin
        .from('leave_types')
        .select('name')
        .eq('id', leaveRequest.leave_type_id)
        .single()

      const html = emailTemplates.leaveRequestNotification(
        employee?.full_name || 'Unknown Employee',
        leaveType?.name || 'Unknown Leave Type',
        leaveRequest.start_date,
        leaveRequest.end_date,
        leaveRequest.total_days,
        leaveRequest.reason
      )

      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: hrEmails.join(', '),
        subject: `Leave Request - ${employee?.full_name || 'Employee'} - ${leaveType?.name || 'Leave'}`,
        html: html
      }

      const info = await transporter.sendMail(mailOptions)
      console.log('✅ Leave request notification sent:', info.messageId)
      return true
    } catch (error) {
      console.error('❌ Failed to send leave request notification:', error)
      return false
    }
  },

  // Send email notification for leave status update
  async sendLeaveStatusUpdate(leaveRequest) {
    if (!transporter) {
      console.log('⚠️ Email service not configured - skipping leave status update notification')
      return false
    }

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('full_name, email')
        .eq('id', leaveRequest.employee_id)
        .single()

      const { data: leaveType } = await supabaseAdmin
        .from('leave_types')
        .select('name')
        .eq('id', leaveRequest.leave_type_id)
        .single()

      const html = emailTemplates.leaveStatusUpdate(
        employee?.full_name || 'Unknown Employee',
        leaveType?.name || 'Unknown Leave Type',
        leaveRequest.start_date,
        leaveRequest.end_date,
        leaveRequest.status,
        leaveRequest.hr_remarks
      )

      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: employee?.email,
        subject: `Leave Request ${leaveRequest.status === 'approved_by_hr' ? 'Approved' : 'Rejected'} - ${leaveType?.name || 'Leave'}`,
        html: html
      }

      const info = await transporter.sendMail(mailOptions)
      console.log('✅ Leave status update notification sent:', info.messageId)
      return true
    } catch (error) {
      console.error('❌ Failed to send leave status update notification:', error)
      return false
    }
  },

  // Send email notification for salary slip generation
  async sendSalarySlipNotification(salarySlip, employee) {
    if (!transporter) {
      console.log('⚠️ Email service not configured - skipping salary slip notification')
      return false
    }

    try {
      const html = emailTemplates.salarySlipGenerated(
        employee.full_name,
        salarySlip.month,
        salarySlip.year,
        salarySlip.net_salary,
        salarySlip.gross_salary,
        salarySlip.total_deductions
      )

      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: employee.email,
        subject: `Salary Slip Generated - ${new Date(salarySlip.year, salarySlip.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        html: html
      }

      const info = await transporter.sendMail(mailOptions)
      console.log('✅ Salary slip notification sent:', info.messageId)
      return true
    } catch (error) {
      console.error('❌ Failed to send salary slip notification:', error)
      return false
    }
  },

  // Get HR emails for notifications
  async getHREmails(companyId = null) {
    try {
      let query = supabase
        .from('users')
        .select('email')
        .in('role', ['hr', 'hr_manager', 'admin'])

      // If companyId is provided, filter by company
      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data: hrUsers, error } = await query

      if (error) {
        console.error('❌ Failed to fetch HR emails:', error)
        return []
      }

      return hrUsers?.map(user => user.email) || []
    } catch (error) {
      console.error('❌ Failed to fetch HR emails:', error)
      return []
    }
  }
}

module.exports = {
  ...emailService,
  transporter
}
