const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

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

  if (req.method !== 'POST') {
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
    
    // Extract user ID from token (format: 'demo-token-{user_id}')
    if (!token.startsWith('demo-token-')) {
      return res.status(401).json({ error: 'Invalid token format' })
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's details
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      console.error('User lookup error:', userError)
      return res.status(401).json({ error: 'Invalid token - user not found' })
    }

    // Get HR staff data from request
    const { full_name, email, password, role = 'hr' } = req.body

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Required fields missing: full_name, email, password' })
    }

    // Validate role
    if (!['hr', 'hr_manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be hr or hr_manager' })
    }

    // Check permissions based on role being created
    if (role === 'hr_manager') {
      // Only admin can create HR managers
      if (!['admin'].includes(currentUser.role)) {
        return res.status(403).json({ error: 'Only Admin can create HR managers' })
      }
    } else {
      // Both admin and hr_manager can create HR staff
      if (!['admin', 'hr_manager'].includes(currentUser.role)) {
        return res.status(403).json({ error: 'Only Admin and HR Manager can create HR staff' })
      }
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Generate UUID for new HR user
    const { randomUUID } = require('crypto')
    const newHRUserId = randomUUID()

    // Create new HR user
    const { data: newHRUser, error: createError } = await supabase
      .from('users')
      .insert([
        {
          id: newHRUserId,
          email: email.toLowerCase(),
          password: password,
          full_name: full_name,
          role: role,
          company_id: currentUser.company_id, // Same company as creator
          created_by: currentUser.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('HR user creation error:', createError)
      return res.status(500).json({ 
        error: `Failed to create ${role === 'hr_manager' ? 'HR manager' : 'HR staff'}`,
        message: createError.message 
      })
    }

    // Send welcome email to new HR user
    let emailSent = false
    try {
      const emailUser = process.env.EMAIL_USER
      const emailPass = process.env.EMAIL_PASS
      
      if (emailUser && emailPass) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass
          }
        })

        const isManager = role === 'hr_manager'
        const roleTitle = isManager ? 'HR Manager' : 'HR Staff'
        const roleColor = isManager ? '#2563eb' : '#2563eb'
        
        const responsibilities = isManager ? [
          'Oversee HR operations and strategy',
          'Manage HR staff and their activities', 
          'Review and approve leave requests',
          'Handle complex HR policies and procedures',
          'Lead recruitment and hiring processes',
          'Manage employee relations and development',
          'Create and add new HR staff members'
        ] : [
          'Manage employee records and information',
          'Process leave requests and approvals',
          'Handle HR documentation and policies', 
          'Support employee onboarding and development',
          'Assist with recruitment and hiring processes'
        ]

        const welcomeEmailHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: ${roleColor}; margin-top: 0;">🎉 Welcome ${isManager ? 'as HR Manager' : 'to the HR Team'}!</h2>
              <p>Congratulations ${full_name}! Your ${roleTitle} account has been successfully created.</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; margin-top: 0;">Your ${roleTitle} Account Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Full Name:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${full_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Role:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${roleTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Department:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Human Resources</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0;">🔐 Your Login Credentials:</h3>
              <p style="margin: 0; color: #92400e;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0 0 0; color: #92400e;"><strong>Password:</strong> <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${password}</code></p>
              <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;"><em>⚠️ Please change this password upon your first login for security.</em></p>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #1e40af; margin-top: 0;">🚀 Your ${roleTitle} Responsibilities:</h3>
              <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
                ${responsibilities.map(resp => `<li>${resp}</li>`).join('')}
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="margin: 0; color: #1f2937; font-weight: bold;">Welcome to ${isManager ? 'HR leadership' : 'the HR team'}! 🌟</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from the WorkFlowHR system.</p>
            </div>
          </div>
        `

        const mailOptions = {
          from: emailUser,
          to: email,
          subject: `🎉 Welcome ${isManager ? 'as HR Manager' : 'to the HR Team'} - Your Account Details`,
          html: welcomeEmailHTML
        }

        const info = await transporter.sendMail(mailOptions)
        console.log(`✅ ${roleTitle} welcome email sent:`, info.messageId)
        emailSent = true
      } else {
        console.log('⚠️ Email credentials not configured')
      }
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError)
    }

    // Remove password from response for security
    const { password: _, ...hrUserWithoutPassword } = newHRUser

    return res.status(201).json({
      message: `${role === 'hr_manager' ? 'HR manager' : 'HR staff'} created successfully`,
      user: {
        ...hrUserWithoutPassword,
        role: role
      },
      email_sent: emailSent,
      email_status: emailSent 
        ? 'Welcome email sent successfully' 
        : 'Email not configured - please share credentials manually'
    })

  } catch (error) {
    console.error('Add HR user error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
