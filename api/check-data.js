const { createClient } = require('@supabase/supabase-js')

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Count all users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at, password')
      .order('created_at', { ascending: true })

    // Check for other tables that might have employee data
    const tableChecks = []
    
    // Try to check if there are other common tables
    try {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('count')
      tableChecks.push({ table: 'employees', exists: !empError, count: employees?.length || 0 })
    } catch (e) {
      tableChecks.push({ table: 'employees', exists: false, error: e.message })
    }

    // Remove passwords from response for security
    const safeUsers = allUsers?.map(user => {
      const { password, ...safeUser } = user
      return {
        ...safeUser,
        has_password: !!password,
        password_length: password?.length || 0
      }
    }) || []

    res.status(200).json({
      total_users: allUsers?.length || 0,
      users: safeUsers,
      users_with_passwords: safeUsers.filter(u => u.has_password).length,
      users_without_passwords: safeUsers.filter(u => !u.has_password).length,
      table_checks: tableChecks,
      database_info: {
        url_configured: !!supabaseUrl,
        key_configured: !!supabaseKey,
        query_successful: !usersError
      },
      error: usersError?.message || null
    })

  } catch (error) {
    console.error('Data check error:', error)
    res.status(500).json({ 
      error: 'Check failed',
      message: error.message
    })
  }
}
