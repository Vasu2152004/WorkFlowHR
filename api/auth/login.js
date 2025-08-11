const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Auth error:', authError)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Get user details from users table
    let { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (userError) {
      // If user doesn't exist in users table, create them
      console.log('User not found in users table, creating...')
      
      // Get or create company
      let { data: company } = await supabaseAdmin
        .from('companies')
        .select('*')
        .limit(1)
        .single()

      if (!company) {
        const { data: newCompany } = await supabaseAdmin
          .from('companies')
          .insert([{ name: 'Default Company' }])
          .select()
          .single()
        company = newCompany
      }

      // Create user record
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([{
          id: authData.user.id,
          full_name: authData.user.user_metadata?.full_name || 'User',
          email: authData.user.email,
          role: 'employee',
          company_id: company.id,
          is_active: true
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return res.status(500).json({ error: 'Failed to create user record' })
      }

      userData = newUser
    }

    // Return success response
    res.json({
      user: userData,
      access_token: `demo-token-${userData.id}`,
      refresh_token: authData.session.refresh_token
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
