const { createClient } = require('@supabase/supabase-js')

// Netlify serverless function handler
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
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
        body: JSON.stringify({ error: 'Access token required' })
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

    // Check if user has HR permissions
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only HR staff can manage templates' })
      }
    }

    if (!currentUser.company_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User has no company assigned' })
      }
    }

    // Parse the path to determine the endpoint
    const path = event.path.replace('/.netlify/functions/documents', '')
    
    // Handle different HTTP methods for templates
    if (path.includes('/templates')) {
      switch (event.httpMethod) {
        case 'GET':
          return await handleGetTemplates(event, headers, supabase, currentUser)
        case 'POST':
          return await handleCreateTemplate(event, headers, supabase, currentUser)
        case 'PUT':
          return await handleUpdateTemplate(event, headers, supabase, currentUser)
        case 'DELETE':
          return await handleDeleteTemplate(event, headers, supabase, currentUser)
        default:
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          }
      }
    }

    // Handle document generation
    if (path.includes('/generate')) {
      if (event.httpMethod === 'POST') {
        return await handleGenerateDocument(event, headers, supabase, currentUser)
      }
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    }

  } catch (error) {
    console.error('Document API error:', error)
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

// Get all templates for the company
async function handleGetTemplates(event, headers, supabase, currentUser) {
  try {
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch templates' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(templates)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Create a new template
async function handleCreateTemplate(event, headers, supabase, currentUser) {
  try {
    const { document_name, field_tags, content, settings } = JSON.parse(event.body)

    // Validation
    if (!document_name || !field_tags || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    const { data: template, error } = await supabase
      .from('document_templates')
      .insert([{
        document_name,
        field_tags,
        content,
        settings: settings || {},
        company_id: currentUser.company_id,
        created_by: currentUser.id
      }])
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create template' })
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(template)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Update a template
async function handleUpdateTemplate(event, headers, supabase, currentUser) {
  try {
    const templateId = event.path.split('/').pop()
    const { document_name, field_tags, content, settings } = JSON.parse(event.body)

    // Validation
    if (!document_name || !field_tags || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    const { data: template, error } = await supabase
      .from('document_templates')
      .update({
        document_name,
        field_tags,
        content,
        settings: settings || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('company_id', currentUser.company_id)
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update template' })
      }
    }

    if (!template) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Template not found' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(template)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Delete a template
async function handleDeleteTemplate(event, headers, supabase, currentUser) {
  try {
    const templateId = event.path.split('/').pop()

    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', templateId)
      .eq('company_id', currentUser.company_id)

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete template' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Template deleted successfully' })
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Generate a document from template
async function handleGenerateDocument(event, headers, supabase, currentUser) {
  try {
    const { template_id, field_values } = JSON.parse(event.body)

    // Validation
    if (!template_id || !field_values) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', template_id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (templateError || !template) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Template not found' })
      }
    }

    // Generate document content by replacing placeholders
    let generatedContent = template.content
    Object.keys(field_values).forEach(key => {
      const placeholder = `{{${key}}}`
      generatedContent = generatedContent.replace(new RegExp(placeholder, 'g'), field_values[key] || `[${key}]`)
    })

    // Save the generated document
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .insert([{
        template_id,
        content: generatedContent,
        field_values,
        company_id: currentUser.company_id,
        generated_by: currentUser.id
      }])
      .select()
      .single()

    if (docError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save generated document' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Document generated successfully',
        document: document,
        content: generatedContent
      })
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
