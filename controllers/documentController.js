const { supabase } = require('../config/supabase')
const puppeteer = require('puppeteer')

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
      return res.status(500).json({ 
        error: 'Failed to fetch templates',
        details: error.message 
      })
    }

    res.json({ templates: templates || [] })
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
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
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create new document template
const createDocumentTemplate = async (req, res) => {
  try {
    const { document_name, field_tags, content, settings = {} } = req.body

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
        document_name,
        field_tags,
        content,
        settings,
        created_by: req.user.id,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to create template',
        details: error.message 
      })
    }

    res.status(201).json({ 
      message: 'Template created successfully',
      template 
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update document template
const updateDocumentTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { document_name, field_tags, content, settings = {}, is_active } = req.body

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
        settings: settings,
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

    // Generate PDF with proper formatting preservation
    const pdfBuffer = await generatePDFFromHTML(generatedContent)

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${template.document_name}_${new Date().toISOString().split('T')[0]}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    
    res.send(pdfBuffer)

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Generate PDF from HTML content with formatting preservation
const generatePDFFromHTML = async (htmlContent) => {
  let browser
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()

    // Create a complete HTML document with proper styling
    const fullHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Generated Document</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              background: white;
              padding: 40px;
              font-size: 14px;
            }
            
            /* Preserve all rich text formatting */
            .prose {
              max-width: none;
            }
            
            .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 600;
              line-height: 1.25;
            }
            
            .prose h1 { font-size: 2.25em; }
            .prose h2 { font-size: 1.875em; }
            .prose h3 { font-size: 1.5em; }
            .prose h4 { font-size: 1.25em; }
            .prose h5 { font-size: 1.125em; }
            .prose h6 { font-size: 1em; }
            
            .prose p {
              margin-bottom: 1em;
              text-align: justify;
            }
            
            .prose ul, .prose ol {
              margin-bottom: 1em;
              padding-left: 1.5em;
            }
            
            .prose li {
              margin-bottom: 0.25em;
            }
            
            .prose blockquote {
              border-left: 4px solid #e5e7eb;
              padding-left: 1em;
              margin: 1em 0;
              font-style: italic;
            }
            
            .prose table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
            }
            
            .prose th, .prose td {
              border: 1px solid #d1d5db;
              padding: 0.5em;
              text-align: left;
            }
            
            .prose th {
              background-color: #f9fafb;
              font-weight: 600;
            }
            
            /* Preserve text alignment */
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
            
            /* Preserve font weights */
            .font-light { font-weight: 300; }
            .font-normal { font-weight: 400; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            
            /* Preserve text colors */
            .text-gray-900 { color: #111827; }
            .text-gray-800 { color: #1f2937; }
            .text-gray-700 { color: #374151; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-400 { color: #9ca3af; }
            .text-gray-300 { color: #d1d5db; }
            .text-gray-200 { color: #e5e7eb; }
            .text-gray-100 { color: #f3f4f6; }
            
            /* Preserve spacing */
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-3 > * + * { margin-top: 0.75rem; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .space-y-5 > * + * { margin-top: 1.25rem; }
            .space-y-6 > * + * { margin-top: 1.5rem; }
            
            /* Preserve margins and padding */
            .m-1 { margin: 0.25rem; }
            .m-2 { margin: 0.5rem; }
            .m-3 { margin: 0.75rem; }
            .m-4 { margin: 1rem; }
            .m-5 { margin: 1.25rem; }
            .m-6 { margin: 1.5rem; }
            
            .p-1 { padding: 0.25rem; }
            .p-2 { padding: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .p-4 { padding: 1rem; }
            .p-5 { padding: 1.25rem; }
            .p-6 { padding: 1.5rem; }
            
            /* Preserve borders */
            .border { border: 1px solid #d1d5db; }
            .border-2 { border: 2px solid #d1d5db; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-400 { border-color: #9ca3af; }
            
            /* Preserve background colors */
            .bg-white { background-color: #ffffff; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-gray-200 { background-color: #e5e7eb; }
            
            /* Preserve rounded corners */
            .rounded { border-radius: 0.25rem; }
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-xl { border-radius: 0.75rem; }
            
            /* Preserve shadows */
            .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
            .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
            
            /* Preserve flexbox */
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .flex-row { flex-direction: row; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            
            /* Preserve grid */
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .gap-1 { gap: 0.25rem; }
            .gap-2 { gap: 0.5rem; }
            .gap-3 { gap: 0.75rem; }
            .gap-4 { gap: 1rem; }
            .gap-5 { gap: 1.25rem; }
            .gap-6 { gap: 1.5rem; }
            
            /* Page break settings */
            @page {
              margin: 1in;
              size: A4;
            }
            
            /* Avoid page breaks inside important elements */
            h1, h2, h3, h4, h5, h6, p, table, blockquote {
              page-break-inside: avoid;
            }
            
            /* Force page breaks where needed */
            .page-break { page-break-before: always; }
            
            /* Ensure proper spacing for printing */
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              
              .prose {
                max-width: none;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="prose">
            ${htmlContent}
          </div>
        </body>
      </html>
    `

    await page.setContent(fullHTML, { waitUntil: 'networkidle0' })

    // Generate PDF with proper settings
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    })

    return pdf

  } catch (error) {
    throw new Error('Failed to generate PDF')
  } finally {
    if (browser) {
      await browser.close()
    }
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