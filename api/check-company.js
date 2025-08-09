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

    // Get all users grouped by company
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id, created_at')
      .order('company_id', { ascending: true })

    if (usersError) {
      return res.status(500).json({ error: usersError.message })
    }

    // Group users by company_id
    const companiesMap = {}
    allUsers.forEach(user => {
      const companyId = user.company_id || 'no_company'
      if (!companiesMap[companyId]) {
        companiesMap[companyId] = []
      }
      companiesMap[companyId].push(user)
    })

    // Get company details if companies table exists
    let companyDetails = {}
    try {
      const { data: companies, error: compError } = await supabase
        .from('companies')
        .select('*')
      
      if (!compError && companies) {
        companies.forEach(company => {
          companyDetails[company.id] = company
        })
      }
    } catch (e) {
      // Companies table might not exist
    }

    // Get the main company ID (the one with most users or the specific one)
    const mainCompanyId = '48a5892f-a5a3-413c-98a6-1ff492556022' // From your previous data
    const mainCompanyUsers = companiesMap[mainCompanyId] || []

    // Check specific user's company
    const testUser = allUsers.find(u => u.email === '22ce137.vasu.kalavadiya@vvpedulink.ac.in')

    res.status(200).json({
      total_users: allUsers.length,
      total_companies: Object.keys(companiesMap).length,
      companies_breakdown: Object.keys(companiesMap).map(companyId => ({
        company_id: companyId,
        user_count: companiesMap[companyId].length,
        users: companiesMap[companyId].map(u => ({
          email: u.email,
          full_name: u.full_name,
          role: u.role
        }))
      })),
      main_company: {
        company_id: mainCompanyId,
        user_count: mainCompanyUsers.length,
        users: mainCompanyUsers
      },
      test_user_company: testUser ? {
        email: testUser.email,
        company_id: testUser.company_id,
        same_as_main: testUser.company_id === mainCompanyId
      } : null,
      company_details: companyDetails
    })

  } catch (error) {
    console.error('Company check error:', error)
    res.status(500).json({ 
      error: 'Check failed',
      message: error.message
    })
  }
}
