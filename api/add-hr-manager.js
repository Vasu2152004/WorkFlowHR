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

    // Check permissions - only admin can create HR managers
    if (!['admin'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only Admin can create HR managers' })
    }

    // Get HR manager data from request
    const { full_name, email, password } = req.body

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Required fields missing: full_name, email, password' })
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

    // Generate UUID for new HR manager
    const { randomUUID } = require('crypto')
    const newHRManagerId = randomUUID()

    // Create new HR manager
    const { data: newHRManager, error: createError } = await supabase
      .from('users')
      .insert([
        {
          id: newHRManagerId,
          email: email.toLowerCase(),
          password: password,
          full_name: full_name,
          role: 'hr_manager',
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
      console.error('HR manager creation error:', createError)
      return res.status(500).json({ 
        error: 'Failed to create HR manager',
        message: createError.message 
      })
    }

    // Send welcome email to new HR manager
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

        const welcomeEmailHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin-top: 0;">🎉 Welcome as HR Manager!</h2>
              <p>Congratulations ${full_name}! Your HR Manager account has been successfully created.</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; margin-top: 0;">Your HR Manager Account Details:</h3>
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
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">HR Manager</td>
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
              <h3 style="color: #1e40af; margin-top: 0;">🚀 Your HR Manager Responsibilities:</h3>
              <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>Oversee HR operations and strategy</li>
                <li>Manage HR staff and their activities</li>
                <li>Review and approve leave requests</li>
                <li>Handle complex HR policies and procedures</li>
                <li>Lead recruitment and hiring processes</li>
                <li>Manage employee relations and development</li>
                <li>Create and add new HR staff members</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="margin: 0; color: #1f2937; font-weight: bold;">Welcome to HR leadership! 🌟</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from the WorkFlowHR system.</p>
            </div>
          </div>
        `

        const mailOptions = {
          from: emailUser,
          to: email,
          subject: `🎉 Welcome as HR Manager - Your Account Details`,
          html: welcomeEmailHTML
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('✅ HR manager welcome email sent:', info.messageId)
        emailSent = true
      } else {
        console.log('⚠️ Email credentials not configured')
      }
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError)
    }

    // Remove password from response for security
    const { password: _, ...hrManagerWithoutPassword } = newHRManager

    return res.status(201).json({
      message: 'HR manager created successfully',
      user: {
        ...hrManagerWithoutPassword,
        role: 'hr_manager'
      },
      email_sent: emailSent,
      email_status: emailSent 
        ? 'Welcome email sent successfully' 
        : 'Email not configured - please share credentials manually'
    })

  } catch (error) {
    console.error('Add HR manager error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
