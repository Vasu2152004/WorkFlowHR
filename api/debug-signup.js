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

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      method: req.method
    })

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Environment variables missing',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    if (req.method === 'GET') {
      // Test database connection and check schema
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('*')
        .limit(3)

      // Try to get schema information by checking what columns exist
      const sampleUser = testData?.[0]
      const allColumns = sampleUser ? Object.keys(sampleUser) : []

      return res.status(200).json({
        message: 'Debug signup endpoint working',
        database_connection: !testError,
        database_error: testError?.message,
        sample_users: testData,
        available_columns: allColumns,
        foreign_key_analysis: {
          has_manager_id: allColumns.includes('manager_id'),
          has_parent_id: allColumns.includes('parent_id'),
          has_created_by: allColumns.includes('created_by'),
          has_supervisor_id: allColumns.includes('supervisor_id')
        },
        instructions: 'Send POST with email, password, full_name to test signup'
      })
    }

    if (req.method === 'POST') {
      const { email, password, full_name } = req.body

      console.log('Signup attempt:', { email, hasPassword: !!password, full_name })

      if (!email || !password || !full_name) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          provided: { email: !!email, password: !!password, full_name: !!full_name }
        })
      }

      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      console.log('User check:', { exists: !!existingUser, error: checkError?.message })

      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' })
      }

      // Test company assignment
      const testCompanyId = '51c9890f-7efe-45b0-9faf-595208b87143'

      // Use your existing user ID as the creator (for foreign key constraint)
      const creatorUserId = '84c5a3ad-4d6d-417e-a730-85ea8c85d98a' // Your user ID

      // Try to create user WITHOUT explicit ID (let database handle it)
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            email: email.toLowerCase(),
            password: password,
            full_name: full_name,
            role: 'admin',
            company_id: testCompanyId,
            created_by: creatorUserId, // Foreign key to satisfy constraint
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      console.log('Create result:', { success: !!newUser, error: createError?.message })

      if (createError) {
        return res.status(500).json({ 
          error: 'Failed to create user',
          database_error: createError.message,
          details: createError
        })
      }

      const { password: _, ...userWithoutPassword } = newUser

      return res.status(201).json({
        message: 'User created successfully',
        user: userWithoutPassword
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Debug signup error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    })
  }
}
