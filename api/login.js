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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Login attempt:', { email: req.body.email, hasPassword: !!req.body.password })
    console.log('Environment check:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseKey,
      urlStart: supabaseUrl?.substring(0, 20) + '...'
    })

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Database configuration missing',
        message: 'Please set up environment variables',
        debug: { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    console.log('Querying user:', email.toLowerCase())

    // Query user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    console.log('Database query result:', { 
      hasUser: !!user, 
      error: error?.message,
      userEmail: user?.email 
    })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        debug: { dbError: error.message } 
      })
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        debug: { reason: 'User not found' }
      })
    }

    console.log('Password check:', { 
      provided: password?.substring(0, 3) + '...', 
      stored: user.password?.substring(0, 3) + '...',
      match: user.password === password
    })

    // For demo purposes, we'll do a simple password check
    // In production, you should use proper password hashing
    if (user.password !== password) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        debug: { reason: 'Password mismatch' }
      })
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      token: 'demo-token-' + user.id // In production, use proper JWT
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
