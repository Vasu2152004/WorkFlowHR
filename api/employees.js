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

  if (req.method !== 'GET') {
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
