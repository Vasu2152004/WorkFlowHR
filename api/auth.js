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

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database configuration missing',
        message: 'Please set up environment variables'
      })
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    if (event.httpMethod === 'GET') {
      // Handle profile request
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

      // Get user profile
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, company_id, company_name, created_at, is_active')
        .eq('id', userId)
        .single()

      if (error || !user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            company_id: user.company_id,
            company_name: user.company_name,
            created_at: user.created_at,
            is_active: user.is_active
          }
        })
      }
    } else if (event.httpMethod === 'POST') {
      // Handle login and register
      const { email, password, full_name, company_name } = JSON.parse(event.body)
      
      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email and password are required' })
        }
      }

      // Check if this is a login or register request
      if (full_name && company_name) {
        // This is a register request - ONLY ALLOWED FOR FIRST ADMIN
        console.log('Register attempt:', { email: email.toLowerCase(), hasPassword: !!password })
        
        // Check if any users exist in the system
        const { data: existingUsers, error: usersCheckError } = await supabase
          .from('users')
          .select('id, role')
          .limit(1)

        if (usersCheckError) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to check system status' })
          }
        }

        // Only allow registration if no users exist (first admin)
        if (existingUsers && existingUsers.length > 0) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Registration is disabled. Only the first admin can create an account.' })
          }
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email.toLowerCase())
          .single()

        if (existingUser) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User already exists with this email' })
          }
        }

        // Create first admin user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            full_name,
            email: email.toLowerCase(),
            password,
            company_name,
            role: 'admin', // First user is always admin
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select('*')
          .single()

        if (createError) {
          console.error('User creation error:', createError)
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to create user' })
          }
        }

        console.log('First admin user created successfully:', newUser.email)
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            message: 'Admin account created successfully! Please login.',
            user: { id: newUser.id, email: newUser.email, full_name: newUser.full_name, role: newUser.role }
          })
        }

      } else {
        // This is a login request
        console.log('Login attempt:', { email: email.toLowerCase(), hasPassword: !!password })
        
        // Query user from database
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .single()

        if (error || !user) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid credentials' })
          }
        }

        // For demo purposes, we'll do a simple password check
        // In production, you should use proper password hashing
        if (user.password !== password) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid credentials' })
          }
        }

        console.log('Login successful for user:', user.email)
        
        // Generate access token
        const access_token = `demo-token-${user.id}`
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            user: {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              role: user.role,
              company_id: user.company_id
            },
            access_token,
            message: 'Login successful'
          })
        }
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Auth API error:', error)
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
