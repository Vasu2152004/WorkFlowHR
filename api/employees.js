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

  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
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
    console.log('Fetching employees for token:', token.substring(0, 20) + '...')

    // Extract user ID from token (format: 'demo-token-{user_id}')
    if (!token.startsWith('demo-token-')) {
      return res.status(401).json({ error: 'Invalid token format' })
    }

    const userId = token.replace('demo-token-', '')
    console.log('Extracted user ID:', userId)

    // Get the logged-in user's company_id
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      console.error('User lookup error:', userError)
      return res.status(401).json({ error: 'Invalid token - user not found' })
    }

    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'User has no company assigned' })
    }

    console.log('Current user company:', currentUser.company_id)
    const userCompanyId = currentUser.company_id

    // Handle POST request (Add Employee)
    if (req.method === 'POST') {
      return await handleAddEmployee(req, res, supabase, currentUser)
    }

    // Handle DELETE request (Delete Employee)
    if (req.method === 'DELETE') {
      return await handleDeleteEmployee(req, res, supabase, currentUser)
    }

    // Fetch employees from the main company (using only existing columns)
    const { data: employees, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        company_id,
        created_at
      `)
      .eq('company_id', userCompanyId)
      .neq('role', 'admin') // Exclude admin from employee list
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log(`Found ${employees.length} employees for company ${userCompanyId} (user: ${currentUser.email})`)

    // Transform data to match frontend expectations (using available columns only)
    const transformedEmployees = employees.map(emp => ({
      id: emp.id,
      full_name: emp.full_name,
      email: emp.email,
      department: 'Not Assigned', // Column doesn't exist yet
      designation: 'Not Assigned', // Column doesn't exist yet
      salary: 50000, // Default salary
      joining_date: emp.created_at,
      phone_number: '', // Column doesn't exist yet
      address: '', // Column doesn't exist yet
      role: emp.role,
      company_id: emp.company_id,
      leave_balance: 20, // Default leave balance
      status: 'active',
      created_at: emp.created_at
    }))

    res.status(200).json({
      success: true,
      employees: transformedEmployees,
      total: transformedEmployees.length,
      company_id: userCompanyId,
      current_user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role
      },
      message: 'Employees fetched successfully'
    })

  } catch (error) {
    console.error('Employees fetch error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch employees',
      message: error.message
    })
  }
}

// Handle Add Employee functionality
async function handleAddEmployee(req, res, supabase, currentUser) {
  try {
    // Check if user has permission to add employees
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only Admin, HR Manager, and HR can create employees' })
    }

    // Get employee data from request
    const {
      full_name,
      email,
      salary,
      joining_date,
      phone_number,
      address,
      emergency_contact,
      pan_number,
      bank_account,
      leave_balance
    } = req.body

    if (!full_name || !email || !salary) {
      return res.status(400).json({ error: 'Required fields missing: full_name, email, salary' })
    }

    // Set defaults for missing database columns
    const department = req.body.department || 'Not Assigned'
    const designation = req.body.designation || 'Employee'

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Generate employee ID and password
    const generateEmployeeId = () => {
      const timestamp = Date.now().toString().slice(-6)
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      return `EMP${timestamp}${random}`
    }

    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
      let password = ''
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const employeeId = generateEmployeeId()
    const generatedPassword = generatePassword()

    // Determine role based on designation (HR roles get hr/hr_manager)
    let role = 'employee'
    if (designation.toLowerCase().includes('hr manager') || designation.toLowerCase().includes('hr-manager')) {
      role = 'hr_manager'
    } else if (designation.toLowerCase().includes('hr') || designation.toLowerCase().includes('human resources')) {
      role = 'hr'
    }

    // Generate UUID for new employee
    const { randomUUID } = require('crypto')
    const newEmployeeId = randomUUID()

    // Create new employee
    const { data: newEmployee, error: createError } = await supabase
      .from('users')
      .insert([
        {
          id: newEmployeeId,
          email: email.toLowerCase(),
          password: generatedPassword,
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
      console.error('Employee creation error:', createError)
      return res.status(500).json({ 
        error: 'Failed to create employee',
        message: createError.message 
      })
    }

    // Remove password from response for security
    const { password: _, ...employeeWithoutPassword } = newEmployee

    // Send welcome email with credentials (inline implementation)
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
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #16a34a; margin-top: 0;">🎉 Welcome to Your Company!</h2>
              <p>Congratulations ${full_name}! Your employee account has been successfully created.</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; margin-top: 0;">Your Account Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Full Name:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${full_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Employee ID:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${employeeId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Department:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${department}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Designation:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${designation}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0;">🔐 Your Login Credentials:</h3>
              <p style="margin: 0; color: #92400e;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0 0 0; color: #92400e;"><strong>Temporary Password:</strong> <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${generatedPassword}</code></p>
              <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;"><em>⚠️ Please change this password upon your first login for security.</em></p>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #1e40af; margin-top: 0;">🚀 Next Steps:</h3>
              <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>Login to the WorkFlowHR system using your credentials</li>
                <li>Complete your profile information</li>
                <li>Review company policies and procedures</li>
                <li>Contact HR if you need any assistance</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="margin: 0; color: #1f2937; font-weight: bold;">Welcome to the team! 🌟</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from the WorkFlowHR system.</p>
            </div>
          </div>
        `

        const mailOptions = {
          from: emailUser,
          to: email,
          subject: `🎉 Welcome to Your Company - Your Account Details`,
          html: welcomeEmailHTML
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('✅ Welcome email sent:', info.messageId)
        emailSent = true
      } else {
        console.log('⚠️ Email credentials not configured')
      }
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError)
    }

    return res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        ...employeeWithoutPassword,
        employee_id: employeeId,
        password: generatedPassword // Include in response for now
      },
      email_sent: emailSent,
      email_status: emailSent 
        ? 'Welcome email sent successfully' 
        : 'Email not configured - please share credentials manually'
    })

  } catch (error) {
    console.error('Add employee error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}

// Handle DELETE employee request
async function handleDeleteEmployee(req, res, supabase, currentUser) {
  try {
    // Check permissions - only admin, hr_manager, and hr can delete employees
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ 
        error: 'Permission denied. Only Admin, HR Manager, and HR can delete employees.' 
      })
    }

    // Get employee ID from query parameters
    const { employee_id } = req.query
    if (!employee_id) {
      return res.status(400).json({ 
        error: 'Employee ID is required for deletion' 
      })
    }

    console.log('Attempting to delete employee:', employee_id)

    // First, check if the employee exists and belongs to the same company
    const { data: employeeToDelete, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name, email, role, company_id')
      .eq('id', employee_id)
      .single()

    if (fetchError || !employeeToDelete) {
      return res.status(404).json({ 
        error: 'Employee not found' 
      })
    }

    // Check if the employee belongs to the same company (company isolation)
    if (employeeToDelete.company_id !== currentUser.company_id) {
      return res.status(403).json({ 
        error: 'Permission denied. You can only delete employees from your company.' 
      })
    }

    // Prevent deleting yourself
    if (employeeToDelete.id === currentUser.id) {
      return res.status(400).json({ 
        error: 'You cannot delete your own account' 
      })
    }

    // Delete the employee
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', employee_id)

    if (deleteError) {
      console.error('Delete employee error:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete employee', 
        details: deleteError.message 
      })
    }

    console.log('✅ Employee deleted successfully:', employeeToDelete.full_name)

    return res.status(200).json({
      message: 'Employee deleted successfully',
      deleted_employee: {
        id: employeeToDelete.id,
        name: employeeToDelete.full_name,
        email: employeeToDelete.email,
        role: employeeToDelete.role
      }
    })

  } catch (error) {
    console.error('Delete employee error:', error)
    return res.status(500).json({ 
      error: 'Failed to delete employee', 
      details: error.message 
    })
  }
}
