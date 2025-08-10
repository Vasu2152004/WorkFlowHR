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

  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
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

    // Get the logged-in user's company_id and role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return res.status(401).json({ error: 'Invalid token - user not found' })
    }

    // Check if user has HR permissions
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can manage templates' })
    }

    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'User has no company assigned' })
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGetTemplates(req, res, supabase, currentUser)
      case 'POST':
        return await handleCreateTemplate(req, res, supabase, currentUser)
      case 'PUT':
        return await handleUpdateTemplate(req, res, supabase, currentUser)
      case 'DELETE':
        return await handleDeleteTemplate(req, res, supabase, currentUser)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Template API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

// Get all templates for the company
async function handleGetTemplates(req, res, supabase, currentUser) {
  try {
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({
      success: true,
      templates: templates || [],
      total: templates?.length || 0,
      company_id: currentUser.company_id
    })

  } catch (error) {
    console.error('Get templates error:', error)
    return res.status(500).json({ error: 'Failed to fetch templates' })
  }
}

// Create new template
async function handleCreateTemplate(req, res, supabase, currentUser) {
  try {
    const {
      document_name,
      description,
      content,
      field_tags,
      template_type,
      is_active = true
    } = req.body

    if (!document_name || !content) {
      return res.status(400).json({ error: 'Document name and content are required' })
    }

    // Generate UUID for new template
    const { randomUUID } = require('crypto')
    const templateId = randomUUID()

    const { data: newTemplate, error: createError } = await supabase
      .from('document_templates')
      .insert([{
        id: templateId,
        document_name,
        description: description || '',
        content,
        field_tags: field_tags || [],
        template_type: template_type || 'general',
        is_active,
        company_id: currentUser.company_id,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (createError) {
      console.error('Template creation error:', createError)
      return res.status(500).json({ 
        error: 'Failed to create template',
        message: createError.message 
      })
    }

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: newTemplate
    })

  } catch (error) {
    console.error('Create template error:', error)
    return res.status(500).json({ error: 'Failed to create template' })
  }
}

// Update existing template
async function handleUpdateTemplate(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' })
    }

    const {
      document_name,
      description,
      content,
      field_tags,
      template_type,
      is_active
    } = req.body

    // Check if template exists and belongs to the company
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingTemplate) {
      return res.status(404).json({ error: 'Template not found' })
    }

    // Update template
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (document_name !== undefined) updateData.document_name = document_name
    if (description !== undefined) updateData.description = description
    if (content !== undefined) updateData.content = content
    if (field_tags !== undefined) updateData.field_tags = field_tags
    if (template_type !== undefined) updateData.template_type = template_type
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedTemplate, error: updateError } = await supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Template update error:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update template',
        message: updateError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      template: updatedTemplate
    })

  } catch (error) {
    console.error('Update template error:', error)
    return res.status(500).json({ error: 'Failed to update template' })
  }
}

// Delete template
async function handleDeleteTemplate(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' })
    }

    // Check if template exists and belongs to the company
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingTemplate) {
      return res.status(404).json({ error: 'Template not found' })
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Template deletion error:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete template',
        message: deleteError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
      deleted_template: {
        id: existingTemplate.id,
        name: existingTemplate.document_name
      }
    })

  } catch (error) {
    console.error('Delete template error:', error)
    return res.status(500).json({ error: 'Failed to delete template' })
  }
}
