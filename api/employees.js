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

  if (req.method !== 'GET' && req.method !== 'POST') {
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
      department,
      designation,
      salary,
      joining_date,
      phone_number,
      address,
      emergency_contact,
      pan_number,
      bank_account,
      leave_balance
    } = req.body

    if (!full_name || !email || !department || !designation || !salary) {
      return res.status(400).json({ error: 'Required fields missing: full_name, email, department, designation, salary' })
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

    // TODO: Send welcome email with credentials
    // This would require email service integration

    return res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        ...employeeWithoutPassword,
        employee_id: employeeId,
        password: generatedPassword // Include in response for now (would be emailed in production)
      },
      email_status: 'Email functionality not implemented yet - please share credentials manually'
    })

  } catch (error) {
    console.error('Add employee error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
