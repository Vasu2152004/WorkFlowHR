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

  // Accept both GET and POST
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Password test endpoint working',
      methods: ['GET', 'POST'],
      instruction: 'Send POST with email and password to test'
    })
  }

  if (req.method === 'POST') {
    try {
      const { createClient } = require('@supabase/supabase-js')
      const { email, password } = req.body

      // Now let's check against the actual database
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseKey) {
        return res.status(200).json({
          error: 'Database not configured',
          manual_test_results: {
            'admin': password === 'admin',
            'password': password === 'password', 
            'test': password === 'test',
            '123456': password === '123456',
            'admin123': password === 'admin123'
          }
        })
      }

      const supabase = createClient(supabaseUrl, supabaseKey)

      // Get the actual user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password, full_name, role')
        .eq('email', email.toLowerCase())
        .single()

      if (error || !user) {
        return res.status(200).json({
          success: false,
          email: email,
          error: 'User not found in database',
          db_error: error?.message
        })
      }

      // Test the actual stored password
      const storedPassword = user.password
      
      // Handle null/undefined password
      if (storedPassword === null || storedPassword === undefined) {
        return res.status(200).json({
          success: false,
          email: email,
          user_found: true,
          error: 'PASSWORD_IS_NULL',
          user_info: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            password_field: storedPassword
          },
          message: 'Password field in database is null/undefined'
        })
      }

      const isExactMatch = storedPassword === password

      return res.status(200).json({
        success: true,
        email: email,
        user_found: true,
        password_analysis: {
          provided: password,
          provided_length: password?.length || 0,
          stored_length: storedPassword?.length || 0,
          stored_starts: storedPassword?.substring(0, 10) || 'N/A',
          stored_password: storedPassword, // Show full password for debugging
          exact_match: isExactMatch,
          is_hashed: (storedPassword?.length || 0) > 20,
          test_results: {
            'admin': storedPassword === 'admin',
            'password': storedPassword === 'password', 
            'test': storedPassword === 'test',
            '123456': storedPassword === '123456',
            'admin123': storedPassword === 'admin123'
          }
        },
        message: isExactMatch ? 'PASSWORD MATCHES!' : 'Password does not match'
      })

    } catch (error) {
      return res.status(500).json({
        error: 'Test failed',
        message: error.message
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
