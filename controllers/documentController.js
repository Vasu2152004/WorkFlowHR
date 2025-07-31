const { supabase } = require('../config/supabase')

// Get all document templates for the company
const getDocumentTemplates = async (req, res) => {
  try {
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('company_id', req.user.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch templates' })
    }

    res.json({ templates })
  } catch (error) {
    console.error('Get document templates error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get single document template
const getDocumentTemplate = async (req, res) => {
  try {
    const { id } = req.params

    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .single()

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' })
    }

    res.json({ template })
  } catch (error) {
    console.error('Get document template error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create new document template
const createDocumentTemplate = async (req, res) => {
  try {
    const { document_name, field_tags, content } = req.body

    // Validate required fields
    if (!document_name || !field_tags || !content) {
      return res.status(400).json({ 
        error: 'Document name, field tags, and content are required' 
      })
    }

    // Validate field_tags structure
    if (!Array.isArray(field_tags) || field_tags.length === 0) {
      return res.status(400).json({ 
        error: 'At least one field tag is required' 
      })
    }

    // Validate each field tag
    for (let i = 0; i < field_tags.length; i++) {
      const field = field_tags[i]
      if (!field.tag || !field.label) {
        return res.status(400).json({ 
          error: `Field ${i + 1} must have both tag and label` 
        })
      }
    }

    // Check for duplicate tags
    const tags = field_tags.map(f => f.tag)
    const uniqueTags = [...new Set(tags)]
    if (tags.length !== uniqueTags.length) {
      return res.status(400).json({ 
        error: 'Duplicate field tags are not allowed' 
      })
    }

    // Create template
    const { data: template, error } = await supabase
      .from('document_templates')
      .insert({
        company_id: req.user.company_id,
        created_by: req.user.id,
        document_name: document_name.trim(),
        field_tags: field_tags,
        content: content
      })
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to create template' })
    }

    res.status(201).json({ 
      message: 'Template created successfully',
      template 
    })

  } catch (error) {
    console.error('Create document template error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update document template
const updateDocumentTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { document_name, field_tags, content, is_active } = req.body

    // Validate required fields
    if (!document_name || !field_tags || !content) {
      return res.status(400).json({ 
        error: 'Document name, field tags, and content are required' 
      })
    }

    // Validate field_tags structure
    if (!Array.isArray(field_tags) || field_tags.length === 0) {
      return res.status(400).json({ 
        error: 'At least one field tag is required' 
      })
    }

    // Validate each field tag
    for (let i = 0; i < field_tags.length; i++) {
      const field = field_tags[i]
      if (!field.tag || !field.label) {
        return res.status(400).json({ 
          error: `Field ${i + 1} must have both tag and label` 
        })
      }
    }

    // Check for duplicate tags
    const tags = field_tags.map(f => f.tag)
    const uniqueTags = [...new Set(tags)]
    if (tags.length !== uniqueTags.length) {
      return res.status(400).json({ 
        error: 'Duplicate field tags are not allowed' 
      })
    }

    // Update template
    const { data: template, error } = await supabase
      .from('document_templates')
      .update({
        document_name: document_name.trim(),
        field_tags: field_tags,
        content: content,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .select('*')
      .single()

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' })
    }

    res.json({ 
      message: 'Template updated successfully',
      template 
    })

  } catch (error) {
    console.error('Update document template error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Delete document template (soft delete)
const deleteDocumentTemplate = async (req, res) => {
  try {
    const { id } = req.params

    const { data: template, error } = await supabase
      .from('document_templates')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .select('*')
      .single()

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' })
    }

    res.json({ 
      message: 'Template deleted successfully',
      template 
    })

  } catch (error) {
    console.error('Delete document template error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Generate document from template
const generateDocument = async (req, res) => {
  try {
    const { template_id, field_values } = req.body

    if (!template_id || !field_values) {
      return res.status(400).json({ 
        error: 'Template ID and field values are required' 
      })
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', template_id)
      .eq('company_id', req.user.company_id)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' })
    }

    // Replace placeholders with values
    let generatedContent = template.content
    template.field_tags.forEach(field => {
      const placeholder = `{{${field.tag}}}`
      const value = field_values[field.tag] || `[${field.label}]`
      generatedContent = generatedContent.replace(new RegExp(placeholder, 'g'), value)
    })

    res.json({ 
      document_name: template.document_name,
      content: generatedContent,
      field_tags: template.field_tags
    })

  } catch (error) {
    console.error('Generate document error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  getDocumentTemplates,
  getDocumentTemplate,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  generateDocument
} 