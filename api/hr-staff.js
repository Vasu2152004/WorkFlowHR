const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

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

  if (event.httpMethod !== 'POST') {
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
    
    // Extract user ID from token (format: 'demo-token-{user_id}')
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
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      console.error('User lookup error:', userError)
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token - user not found' })
      }
    }

    // Get HR staff data from request
    const { full_name, email, password, role = 'hr' } = JSON.parse(event.body)

    if (!full_name || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Required fields missing: full_name, email, password' })
      }
    }

    // Validate role
    if (!['hr', 'hr_manager'].includes(role)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid role. Must be hr or hr_manager' })
      }
    }

    // Check permissions based on role being created
    if (role === 'hr_manager') {
      // Only admin can create HR managers
      if (!['admin'].includes(currentUser.role)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only Admin can create HR managers' })
        }
      }
    } else {
      // Both admin and hr_manager can create HR staff
      if (!['admin', 'hr_manager'].includes(currentUser.role)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only Admin and HR Manager can create HR staff' })
        }
      }
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'User with this email already exists' })
      }
    }

    // Generate UUID for new HR user
    const { randomUUID } = require('crypto')
    const newHRUserId = randomUUID()

    // Create new HR user
    const { data: newHRUser, error: createError } = await supabase
      .from('users')
      .insert([{
        id: newHRUserId,
        full_name,
        email: email.toLowerCase(),
        password,
        role,
        company_id: currentUser.company_id,
        is_active: true,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (createError) {
      console.error('HR user creation error:', createError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create HR user',
          message: createError.message 
        })
      }
    }

    // Send welcome email (if email service is configured)
    try {
      await sendWelcomeEmail(email, full_name, password, role)
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError)
      // Don't fail the request if email fails
    }

    // Remove password from response for security
    const { password: _, ...userWithoutPassword } = newHRUser

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${role === 'hr_manager' ? 'HR Manager' : 'HR Staff'} created successfully`,
        user: {
          ...userWithoutPassword,
          password: password // Include password in response for initial setup
        }
      })
    }

  } catch (error) {
    console.error('HR Staff API error:', error)
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

// Send welcome email to new HR staff
async function sendWelcomeEmail(email, fullName, password, role) {
  // Email service configuration would go here
  // For now, just log the credentials
  console.log(`Welcome email for ${email}:`, { fullName, password, role })
}
