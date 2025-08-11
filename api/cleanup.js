const { createClient } = require('@supabase/supabase-js')

// Netlify serverless function handler
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database configuration missing' })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Authorization header
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header missing' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Extract user ID from token
    if (!token.startsWith('demo-token-')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' })
      }
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's company_id and role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token - user not found' })
      }
    }

    // Only admins can run cleanup
    if (currentUser.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can run cleanup operations' })
      }
    }

    if (event.httpMethod === 'GET') {
      // Get cleanup report
      return await handleGetCleanupReport(headers, supabase, currentUser)
    } else if (event.httpMethod === 'POST') {
      // Run cleanup
      return await handleRunCleanup(headers, supabase, currentUser)
    }

  } catch (error) {
    console.error('Cleanup API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

// Get cleanup report
async function handleGetCleanupReport(headers, supabase, currentUser) {
  try {
    console.log('Getting cleanup report for company:', currentUser.company_id)
    
    // Check for orphaned templates without company_id
    const { data: orphanedTemplates, error: orphanedError } = await supabase
      .from('document_templates')
      .select('id, document_name, company_id, created_at')
      .is('company_id', null)

    // Check for templates with wrong company_id
    const { data: wrongCompanyTemplates, error: wrongCompanyError } = await supabase
      .from('document_templates')
      .select('id, document_name, company_id, created_at')
      .neq('company_id', currentUser.company_id)

    // Check for orphaned documents without company_id
    const { data: orphanedDocuments, error: orphanedDocsError } = await supabase
      .from('generated_documents')
      .select('id, document_name, company_id, created_at')
      .is('company_id', null)

    const report = {
      company_id: currentUser.company_id,
      timestamp: new Date().toISOString(),
      orphaned_templates: orphanedTemplates || [],
      wrong_company_templates: wrongCompanyTemplates || [],
      orphaned_documents: orphanedDocuments || [],
      errors: {
        orphaned_templates: orphanedError?.message,
        wrong_company_templates: wrongCompanyError?.message,
        orphaned_documents: orphanedDocsError?.message
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(report)
    }

  } catch (error) {
    console.error('Get cleanup report error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Run cleanup operations
async function handleRunCleanup(headers, supabase, currentUser) {
  try {
    console.log('Running cleanup for company:', currentUser.company_id)
    
    let cleanupResults = {
      company_id: currentUser.company_id,
      timestamp: new Date().toISOString(),
      operations: [],
      errors: []
    }

    // Clean up orphaned templates
    try {
      const { data: deletedTemplates, error: templateError } = await supabase
        .from('document_templates')
        .delete()
        .is('company_id', null)

      if (templateError) {
        cleanupResults.errors.push(`Template cleanup failed: ${templateError.message}`)
      } else {
        cleanupResults.operations.push(`Deleted ${deletedTemplates?.length || 0} orphaned templates`)
      }
    } catch (error) {
      cleanupResults.errors.push(`Template cleanup error: ${error.message}`)
    }

    // Clean up orphaned documents
    try {
      const { data: deletedDocuments, error: docError } = await supabase
        .from('generated_documents')
        .delete()
        .is('company_id', null)

      if (docError) {
        cleanupResults.errors.push(`Document cleanup failed: ${docError.message}`)
      } else {
        cleanupResults.operations.push(`Deleted ${deletedDocuments?.length || 0} orphaned documents`)
      }
    } catch (error) {
      cleanupResults.errors.push(`Document cleanup error: ${error.message}`)
    }

    // Clean up wrong company templates
    try {
      const { data: deletedWrongTemplates, error: wrongCompanyError } = await supabase
        .from('document_templates')
        .delete()
        .neq('company_id', currentUser.company_id)

      if (wrongCompanyError) {
        cleanupResults.errors.push(`Wrong company template cleanup failed: ${wrongCompanyError.message}`)
      } else {
        cleanupResults.operations.push(`Deleted ${deletedWrongTemplates?.length || 0} wrong company templates`)
      }
    } catch (error) {
      cleanupResults.errors.push(`Wrong company template cleanup error: ${error.message}`)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(cleanupResults)
    }

  } catch (error) {
    console.error('Run cleanup error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
