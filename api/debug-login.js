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
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Query user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, full_name, role')
      .eq('email', email.toLowerCase())
      .single()

    if (error) {
      return res.status(200).json({
        debug: 'USER_NOT_FOUND',
        error: error.message,
        email: email
      })
    }

    if (!user) {
      return res.status(200).json({
        debug: 'NO_USER_DATA',
        email: email
      })
    }

    // Debug password information
    const storedPassword = user.password
    const providedPassword = password

    res.status(200).json({
      debug: 'PASSWORD_ANALYSIS',
      email: user.email,
      user_found: true,
      password_info: {
        provided_length: providedPassword.length,
        stored_length: storedPassword.length,
        provided_starts_with: providedPassword.substring(0, 5),
        stored_starts_with: storedPassword.substring(0, 5),
        exact_match: storedPassword === providedPassword,
        stored_looks_hashed: storedPassword.length > 20 && storedPassword.includes('$'),
        stored_password_format: storedPassword.startsWith('$') ? 'BCRYPT_HASH' : 
                               storedPassword.length === 60 ? 'BCRYPT_HASH' :
                               storedPassword.length === 32 ? 'MD5_HASH' :
                               storedPassword.length > 40 ? 'OTHER_HASH' : 'PLAIN_TEXT'
      }
    })

  } catch (error) {
    console.error('Debug login error:', error)
    res.status(500).json({ 
      error: 'Debug failed',
      message: error.message
    })
  }
}
