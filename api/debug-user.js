const { createClient } = require('@supabase/supabase-js')

// Netlify serverless function handler
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get authorization header
    const authHeader = event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header missing or invalid' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token.startsWith('demo-token-')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' })
      }
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's details
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token - user not found', details: userError })
      }
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
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
    }

  } catch (error) {
    console.error('Debug API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    }
  }
}
