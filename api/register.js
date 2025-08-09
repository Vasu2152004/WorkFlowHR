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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // TODO: Add authorization check - only admin/HR should be able to create users
  // For now, this endpoint should only be used by authenticated admin/HR users
  // const authHeader = req.headers.authorization
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return res.status(401).json({ error: 'Authorization required' })
  // }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Database configuration missing',
        message: 'Please set up environment variables'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { email, password, full_name, role = 'admin' } = req.body

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full_name are required' })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Assign to a DIFFERENT company for testing isolation
    // Main company: 48a5892f-a5a3-413c-98a6-1ff492556022 (existing users)
    // Test company: 51c9890f-7efe-45b0-9faf-595208b87143 (new signups)
    const testCompanyId = '51c9890f-7efe-45b0-9faf-595208b87143'

    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email: email.toLowerCase(),
          password: password, // In production, hash this!
          full_name: full_name,
          role: role,
          company_id: testCompanyId, // Assign to test company for isolation
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to create user',
        message: error.message 
      })
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser

    res.status(201).json({
      message: 'User created successfully - assigned to test company for isolation testing',
      user: userWithoutPassword,
      company_isolation_info: {
        assigned_company: testCompanyId,
        role: role,
        note: 'This user will see different employees than main company users'
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
