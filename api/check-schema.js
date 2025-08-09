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

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get one user to see all available columns
    const { data: sampleUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    if (userError) {
      return res.status(500).json({ error: userError.message })
    }

    const availableColumns = sampleUser.length > 0 ? Object.keys(sampleUser[0]) : []

    // Try to get table schema info
    let schemaInfo = null
    try {
      const { data: tableInfo, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: 'users' })
      
      if (!schemaError) {
        schemaInfo = tableInfo
      }
    } catch (e) {
      // RPC might not exist, that's okay
    }

    res.status(200).json({
      success: true,
      table_name: 'users',
      available_columns: availableColumns,
      sample_user: sampleUser[0] || null,
      schema_info: schemaInfo,
      column_count: availableColumns.length,
      analysis: {
        has_department: availableColumns.includes('department'),
        has_designation: availableColumns.includes('designation'),
        has_salary: availableColumns.includes('salary'),
        has_joining_date: availableColumns.includes('joining_date'),
        has_phone_number: availableColumns.includes('phone_number'),
        has_address: availableColumns.includes('address')
      }
    })

  } catch (error) {
    console.error('Schema check error:', error)
    res.status(500).json({ 
      error: 'Schema check failed',
      message: error.message
    })
  }
}
