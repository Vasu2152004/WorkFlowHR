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
      return res.status(500).json({ error: 'Supabase configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' })
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token.startsWith('demo-token-')) {
      return res.status(401).json({ error: 'Invalid token format' })
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's details
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return res.status(401).json({ error: 'Invalid token - user not found', details: userError })
    }

    // Check what permissions this user should have
    const isAdmin = currentUser.role === 'admin'
    const isHRManager = currentUser.role === 'hr_manager'
    const isHR = currentUser.role === 'hr'
    const isEmployee = currentUser.role === 'employee'

    // Get all users in the same company to see the full picture
    const { data: companyUsers, error: companyUsersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .eq('company_id', currentUser.company_id)
      .order('role', { ascending: true })

    res.status(200).json({
      success: true,
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.full_name,
        role: currentUser.role,
        company_id: currentUser.company_id,
        created_at: currentUser.created_at,
        updated_at: currentUser.updated_at
      },
      permissions: {
        isAdmin,
        isHRManager,
        isHR,
        isEmployee,
        canManageTemplates: isAdmin || isHRManager || isHR,
        canManageDocuments: isAdmin || isHRManager || isHR,
        canManageLeaves: isAdmin || isHRManager || isHR,
        canManageSalary: isAdmin || isHRManager || isHR,
        canManageHRStaff: isAdmin || isHRManager,
        canCreateHRManager: isAdmin
      },
      companyUsers: companyUsers || [],
      companyUsersError: companyUsersError?.message || null
    })

  } catch (error) {
    console.error('Debug API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    })
  }
}
