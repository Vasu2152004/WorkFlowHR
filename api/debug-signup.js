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

      // Get an existing user ID from database to understand the ID format
      const { data: existingUsers, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .limit(5)

      console.log('Existing user IDs:', existingUsers?.map(u => u.id))

      // Use one of the existing user IDs that actually exist in the database
      const safeUserId = existingUsers?.[0]?.id || creatorUserId

      // DEBUGGING: Let's see what works in your local vs. production
      return res.status(200).json({
        debug_info: 'Database schema analysis',
        local_vs_production: 'Your signup works locally but fails on Vercel',
        database_constraints: {
          id_required: true,
          id_foreign_key: 'users_id_fkey exists',
          created_by_required: true
        },
        existing_user_ids: existingUsers?.map(u => u.id),
        recommendation: 'The database schema has conflicting constraints. Consider testing signup directly in your frontend instead of this debug endpoint.',
        alternative: 'Use your working local signup logic, or modify the database constraints',
        company_isolation_status: 'Can still test isolation with existing users - your account vs. others'
      })

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
