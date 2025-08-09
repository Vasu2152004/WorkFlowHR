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
    console.log('Fetching employees for token:', token.substring(0, 10) + '...')

    // For now, get the main company employees
    // TODO: Implement proper JWT token verification to get user's company_id
    const mainCompanyId = '48a5892f-a5a3-413c-98a6-1ff492556022'

    // Fetch employees from the main company
    const { data: employees, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        company_id,
        department,
        designation,
        salary,
        joining_date,
        phone_number,
        address,
        created_at,
        updated_at
      `)
      .eq('company_id', mainCompanyId)
      .neq('role', 'admin') // Exclude admin from employee list
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log(`Found ${employees.length} employees for company ${mainCompanyId}`)

    // Transform data to match frontend expectations
    const transformedEmployees = employees.map(emp => ({
      id: emp.id,
      full_name: emp.full_name,
      email: emp.email,
      department: emp.department || 'Not Assigned',
      designation: emp.designation || 'Not Assigned',
      salary: emp.salary || 0,
      joining_date: emp.joining_date || emp.created_at,
      phone_number: emp.phone_number || '',
      address: emp.address || '',
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
      company_id: mainCompanyId,
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
