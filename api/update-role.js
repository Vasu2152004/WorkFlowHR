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

  if (event.httpMethod !== 'PUT') {
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
        body: JSON.stringify({ error: 'Database configuration missing' })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Authorization header
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header missing' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Extract user ID from token
    if (!token.startsWith('demo-token-')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' })
      }
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's current role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token - user not found' })
      }
    }

    const { new_role } = JSON.parse(event.body)

    if (!new_role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'New role is required' })
      }
    }

    // Validate role
    const validRoles = ['employee', 'team_lead', 'hr', 'hr_manager', 'admin']
    if (!validRoles.includes(new_role)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') })
      }
    }

    // Update user role
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        role: new_role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Role update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to update role',
          message: updateError.message 
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Role updated successfully from ${currentUser.role} to ${new_role}`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          role: updatedUser.role,
          company_id: updatedUser.company_id
        }
      })
    }

  } catch (error) {
    console.error('Role update API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
