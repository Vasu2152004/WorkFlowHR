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
    const { email, new_password } = req.body

    if (!email || !new_password) {
      return res.status(400).json({ error: 'Email and new_password are required' })
    }

    // Check if user exists
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('email', email.toLowerCase())
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ 
        error: 'User not found',
        email: email,
        db_error: fetchError?.message
      })
    }

    // Update the password
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        password: new_password,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase())
      .select('id, email, full_name, role')
      .single()

    if (updateError) {
      return res.status(500).json({
        error: 'Failed to update password',
        db_error: updateError.message
      })
    }

    // Test the login immediately
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('password')
      .eq('email', email.toLowerCase())
      .single()

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      user: updatedUser,
      password_test: {
        password_set: testUser?.password === new_password,
        stored_password_length: testUser?.password?.length || 0
      }
    })

  } catch (error) {
    console.error('Set password error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}
