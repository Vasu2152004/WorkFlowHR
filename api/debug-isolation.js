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

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader ? authHeader.replace('Bearer ', '') : 'NO_TOKEN'

    console.log('DEBUG: Full token received:', token)

    let debugInfo = {
      step: 1,
      token_received: token,
      token_format: token.startsWith('demo-token-') ? 'VALID_FORMAT' : 'INVALID_FORMAT',
      extracted_user_id: null,
      user_lookup: null,
      user_company: null,
      employees_in_company: null,
      all_companies: null
    }

    // Extract user ID from token
    if (token.startsWith('demo-token-')) {
      const userId = token.replace('demo-token-', '')
      debugInfo.extracted_user_id = userId
      debugInfo.step = 2

      // Look up the user
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, role, company_id')
        .eq('id', userId)
        .single()

      debugInfo.user_lookup = {
        success: !userError,
        error: userError?.message,
        user_found: !!currentUser,
        user_data: currentUser
      }
      debugInfo.step = 3

      if (currentUser) {
        debugInfo.user_company = currentUser.company_id

        // Get all companies and their user counts
        const { data: allUsers, error: allUsersError } = await supabase
          .from('users')
          .select('company_id, role')

        if (!allUsersError) {
          const companyCounts = {}
          allUsers.forEach(user => {
            const companyId = user.company_id || 'NO_COMPANY'
            if (!companyCounts[companyId]) {
              companyCounts[companyId] = { total: 0, non_admin: 0 }
            }
            companyCounts[companyId].total++
            if (user.role !== 'admin') {
              companyCounts[companyId].non_admin++
            }
          })
          debugInfo.all_companies = companyCounts
        }

        // Get employees for user's company
        if (currentUser.company_id) {
          const { data: employees, error: empError } = await supabase
            .from('users')
            .select('id, email, full_name, role, company_id')
            .eq('company_id', currentUser.company_id)
            .neq('role', 'admin')

          debugInfo.employees_in_company = {
            success: !empError,
            error: empError?.message,
            count: employees?.length || 0,
            employees: employees || []
          }
          debugInfo.step = 4
        }
      }
    }

    res.status(200).json({
      debug_isolation: debugInfo,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Debug isolation error:', error)
    res.status(500).json({ 
      error: 'Debug failed',
      message: error.message
    })
  }
}
