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

    if (!currentUser.company_id) {
      return res.status(400).json({ error: 'User has no company assigned' })
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGetDocuments(req, res, supabase, currentUser)
      case 'POST':
        return await handleGenerateDocument(req, res, supabase, currentUser)
      case 'PUT':
        return await handleUpdateDocument(req, res, supabase, currentUser)
      case 'DELETE':
        return await handleDeleteDocument(req, res, supabase, currentUser)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Document API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

// Get all generated documents for the company
async function handleGetDocuments(req, res, supabase, currentUser) {
  try {
    const { employee_id, template_id, status } = req.query
    
    let query = supabase
      .from('generated_documents')
      .select(`
        *,
        document_templates!inner(document_name, template_type),
        users!inner(full_name, email)
      `)
      .eq('company_id', currentUser.company_id)

    // Apply filters
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }
    if (template_id) {
      query = query.eq('template_id', template_id)
    }
    if (status) {
      query = query.eq('status', status)
    }

    // If user is not HR, only show their own documents
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      query = query.eq('employee_id', currentUser.id)
    }

    const { data: documents, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({
      success: true,
      documents: documents || [],
      total: documents?.length || 0,
      company_id: currentUser.company_id
    })

  } catch (error) {
    console.error('Get documents error:', error)
    return res.status(500).json({ error: 'Failed to fetch documents' })
  }
}

// Generate document from template
async function handleGenerateDocument(req, res, supabase, currentUser) {
  try {
    const {
      template_id,
      employee_id,
      field_values,
      document_title,
      notes,
      status = 'draft'
    } = req.body

    if (!template_id || !employee_id || !field_values) {
      return res.status(400).json({ 
        error: 'Template ID, employee ID, and field values are required' 
      })
    }

    // Check if template exists and belongs to the company
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', template_id)
      .eq('company_id', currentUser.company_id)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found or inactive' })
    }

    // Check if employee exists and belongs to the company
    const { data: employee, error: employeeError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', employee_id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Generate document content by replacing field tags
    let generatedContent = template.content
    if (field_values && typeof field_values === 'object') {
      Object.keys(field_values).forEach(field => {
        const regex = new RegExp(`{{${field}}}`, 'g')
        generatedContent = generatedContent.replace(regex, field_values[field] || '')
      })
    }

    // Generate UUID for new document
    const { randomUUID } = require('crypto')
    const documentId = randomUUID()

    // Create generated document record
    const { data: newDocument, error: createError } = await supabase
      .from('generated_documents')
      .insert([{
        id: documentId,
        template_id,
        employee_id,
        company_id: currentUser.company_id,
        document_title: document_title || template.document_name,
        original_content: template.content,
        generated_content: generatedContent,
        field_values,
        status,
        notes: notes || '',
        generated_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (createError) {
      console.error('Document generation error:', createError)
      return res.status(500).json({ 
        error: 'Failed to generate document',
        message: createError.message 
      })
    }

    res.status(201).json({
      success: true,
      message: 'Document generated successfully',
      document: {
        ...newDocument,
        template_name: template.document_name,
        employee_name: employee.full_name
      }
    })

  } catch (error) {
    console.error('Generate document error:', error)
    return res.status(500).json({ error: 'Failed to generate document' })
  }
}

// Update document status or content
async function handleUpdateDocument(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Document ID is required' })
    }

    const {
      status,
      notes,
      field_values,
      generated_content
    } = req.body

    // Check if document exists and belongs to the company
    const { data: existingDocument, error: fetchError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingDocument) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Check permissions - only HR can update status, employees can only update their own documents
    if (status && !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can update document status' })
    }

    if (existingDocument.employee_id !== currentUser.id && 
        !['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'You can only update your own documents' })
    }

    // Update document
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (field_values !== undefined) updateData.field_values = field_values
    if (generated_content !== undefined) updateData.generated_content = generated_content

    const { data: updatedDocument, error: updateError } = await supabase
      .from('generated_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Document update error:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update document',
        message: updateError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      document: updatedDocument
    })

  } catch (error) {
    console.error('Update document error:', error)
    return res.status(500).json({ error: 'Failed to update document' })
  }
}

// Delete document
async function handleDeleteDocument(req, res, supabase, currentUser) {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Document ID is required' })
    }

    // Check if document exists and belongs to the company
    const { data: existingDocument, error: fetchError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingDocument) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Check permissions - only HR can delete documents
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only HR staff can delete documents' })
    }

    // Delete document
    const { error: deleteError } = await supabase
      .from('generated_documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Document deletion error:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete document',
        message: deleteError.message 
      })
    }

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      deleted_document: {
        id: existingDocument.id,
        title: existingDocument.document_title
      }
    })

  } catch (error) {
    console.error('Delete document error:', error)
    return res.status(500).json({ error: 'Failed to delete document' })
  }
}
