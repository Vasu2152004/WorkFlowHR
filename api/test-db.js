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

    console.log('Environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlStart: supabaseUrl?.substring(0, 30),
      keyStart: supabaseKey?.substring(0, 20)
    })

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Environment variables missing',
        debug: { 
          hasUrl: !!supabaseUrl, 
          hasKey: !!supabaseKey,
          allEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
        }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      return res.status(500).json({
        error: 'Database connection failed',
        debug: {
          supabaseError: error.message,
          code: error.code,
          details: error.details
        }
      })
    }

    // Try to list first few users (without passwords) - discover columns
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)

    // Remove passwords from response for security
    const safeUsers = users?.map(user => {
      const { password, ...safeUser } = user
      return safeUser
    }) || []

    res.status(200).json({
      message: 'Database connection successful',
      connectionTest: 'PASSED',
      userCount: data?.length || 0,
      sampleUsers: safeUsers,
      actualColumns: users?.length > 0 ? Object.keys(users[0]) : [],
      debug: {
        hasUsers: !!users?.length,
        usersError: usersError?.message,
        rawUserCount: users?.length || 0
      }
    })

  } catch (error) {
    console.error('Test DB error:', error)
    res.status(500).json({ 
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    })
  }
}
