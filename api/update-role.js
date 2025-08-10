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

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Extract user ID from token
    if (!token.startsWith('demo-token-')) {
      return res.status(401).json({ error: 'Invalid token format' })
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's current role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return res.status(401).json({ error: 'Invalid token - user not found' })
    }

    const { new_role } = req.body

    if (!new_role) {
      return res.status(400).json({ error: 'New role is required' })
    }

    // Validate role
    const validRoles = ['employee', 'team_lead', 'hr', 'hr_manager', 'admin']
    if (!validRoles.includes(new_role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') })
    }

    // Update user role
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        role: new_role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Role update error:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update role',
        message: updateError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: `Role updated successfully from ${currentUser.role} to ${new_role}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        role: updatedUser.role,
        company_id: updatedUser.company_id
      }
    })

  } catch (error) {
    console.error('Role update API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}
