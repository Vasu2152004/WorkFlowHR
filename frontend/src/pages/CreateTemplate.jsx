import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  FileText,
  Edit,
  Save,
  X,
  Eye,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  Settings,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link,
  Image,
  Table,
  Code,
  Undo,
  Redo
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import RichTextEditor from '../components/RichTextEditor'
import DocumentThemes from '../components/DocumentThemes'

const CreateTemplate = () => {
  const { user } = useAuth()
  const [documentName, setDocumentName] = useState('')
  const [fieldTags, setFieldTags] = useState([
    { tag: '', label: '' }
  ])
  const [content, setContent] = useState('<p>Start writing your document here...</p>')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showThemes, setShowThemes] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [templateSettings, setTemplateSettings] = useState({
    fontSize: '14px',
    fontFamily: 'Arial',
    lineHeight: '1.6',
    pageMargins: '1in',
    headerEnabled: false,
    footerEnabled: false,
    watermark: '',
    pageNumbers: false
  })

  const handleInsertPlaceholder = (placeholder) => {
    const placeholderText = `{{${placeholder}}}`
    // This will be handled by the RichTextEditor component
  }

  const handleCopyTemplate = () => {
    const templateData = {
      document_name: documentName,
      field_tags: fieldTags,
      content: content,
      settings: templateSettings
    }
    
    navigator.clipboard.writeText(JSON.stringify(templateData, null, 2))
    toast.success('Template copied to clipboard!')
  }

  const handleExportTemplate = () => {
    const templateData = {
      document_name: documentName,
      field_tags: fieldTags,
      content: content,
      settings: templateSettings,
      export_date: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    toast.success('Template exported successfully!')
  }

  const handleImportTemplate = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const templateData = JSON.parse(e.target.result)
        setDocumentName(templateData.document_name || '')
        setFieldTags(templateData.field_tags || [{ tag: '', label: '' }])
        setContent(templateData.content || '<p>Start writing your document here...</p>')
        setTemplateSettings(templateData.settings || templateSettings)
        toast.success('Template imported successfully!')
      } catch (error) {
        toast.error('Invalid template file format')
      }
    }
    reader.readAsText(file)
  }

  const addField = () => {
    setFieldTags([...fieldTags, { tag: '', label: '' }])
  }

  const removeField = (index) => {
    if (fieldTags.length > 1) {
      const newFields = fieldTags.filter((_, i) => i !== index)
      setFieldTags(newFields)
    }
  }

  const updateField = (index, field, value) => {
    const newFields = [...fieldTags]
    newFields[index][field] = value
    
    // Auto-generate tag from label when label changes
    if (field === 'label') {
      // Convert label to a clean tag format (lowercase, no spaces, no special chars)
      const cleanTag = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .trim()
      newFields[index].tag = cleanTag
    }
    
    setFieldTags(newFields)
  }

  const validateForm = () => {
    if (!documentName.trim()) {
      setError('Please enter a document name')
      return false
    }

    if (!content.trim() || content === '<p>Start writing your document here...</p>') {
      setError('Please add some content to your document')
      return false
    }

    // Validate field tags
    for (let i = 0; i < fieldTags.length; i++) {
      const field = fieldTags[i]
      if (!field.label.trim()) {
        setError(`Please fill in the label for field ${i + 1}`)
        return false
      }
      
      // Check for duplicate tags
      const duplicateIndex = fieldTags.findIndex((f, idx) => 
        idx !== i && f.tag.trim() === field.tag.trim()
      )
      if (duplicateIndex !== -1) {
        setError(`Duplicate field "${field.label}" found. Each field must be unique.`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:3000/api/documents/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document_name: documentName.trim(),
          field_tags: fieldTags,
          content: content,
          settings: templateSettings
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.')
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create template')
      }

      const data = await response.json()
      setSuccess('Template created successfully!')
      toast.success('Template created successfully!')
      
      // Reset form
      setDocumentName('')
      setFieldTags([{ tag: '', label: '' }])
      setContent('<p>Start writing your document here...</p>')
      setIsPreviewMode(false)
    } catch (error) {
      console.error('Error creating template:', error)
      setError(error.message || 'Failed to create template')
      toast.error(error.message || 'Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  const replacePlaceholders = (content, values) => {
    let result = content
    Object.keys(values).forEach(key => {
      const placeholder = `{{${key}}}`
      result = result.replace(new RegExp(placeholder, 'g'), values[key] || `[${key}]`)
    })
    return result
  }

  const getPreviewContent = () => {
    try {
      const dummyValues = {}
      fieldTags.forEach(field => {
        dummyValues[field.tag] = `[Sample ${field.label}]`
      })
      return replacePlaceholders(content, dummyValues)
    } catch (error) {
      console.error('Error in getPreviewContent:', error)
      return content
    }
  }

  const handleThemeSelect = (themeTemplate) => {
    setContent(themeTemplate)
    setShowThemes(false)
  }

  if (!user || user.role !== 'hr') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only HR users can create document templates.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Document Template</h1>
            <p className="text-gray-600 dark:text-gray-300">Create reusable document templates with dynamic variables</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Name */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Details
            </h3>
            
            <div>
              <label htmlFor="documentName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document Name
              </label>
              <input
                type="text"
                id="documentName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                required
                className="input-field"
                placeholder="e.g., Offer Letter, LOR, Contract"
              />
            </div>
          </div>

          {/* Dynamic Field Builder */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Custom Fields</h3>
            
            <div className="space-y-3">
              {fieldTags.map((field, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex space-x-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, 'label', e.target.value)}
                        placeholder="Field Label (e.g., Employee Name)"
                        className="input-field"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      disabled={fieldTags.length === 1}
                      className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {field.label && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      Tag: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{field.tag}</code>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addField}
                className="btn-secondary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </button>
            </div>

            {/* Available Placeholders */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Available Placeholders:</h4>
              <div className="flex flex-wrap gap-2">
                {fieldTags.map((field) => (
                  <code key={field.tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-sm">
                    {`{{${field.tag}}}`}
                  </code>
                ))}
              </div>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Content</h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowThemes(true)}
                  className="btn-primary flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Choose Theme
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    !isPreviewMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(true)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isPreviewMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </button>
              </div>
            </div>

            {!isPreviewMode ? (
              <RichTextEditor
                content={content}
                onContentChange={setContent}
                fieldTags={fieldTags}
                onInsertPlaceholder={handleInsertPlaceholder}
              />
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[400px] bg-white dark:bg-gray-800">
                <div 
                  className="prose max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                />
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Settings</h3>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="btn-secondary flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                {showAdvancedSettings ? 'Hide Settings' : 'Show Settings'}
              </button>
            </div>

            {showAdvancedSettings && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Font Family
                    </label>
                    <select
                      value={templateSettings.fontFamily}
                      onChange={(e) => setTemplateSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                      className="input-field"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Calibri">Calibri</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Font Size
                    </label>
                    <select
                      value={templateSettings.fontSize}
                      onChange={(e) => setTemplateSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                      className="input-field"
                    >
                      <option value="12px">12px</option>
                      <option value="14px">14px</option>
                      <option value="16px">16px</option>
                      <option value="18px">18px</option>
                      <option value="20px">20px</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Line Height
                    </label>
                    <select
                      value={templateSettings.lineHeight}
                      onChange={(e) => setTemplateSettings(prev => ({ ...prev, lineHeight: e.target.value }))}
                      className="input-field"
                    >
                      <option value="1.2">1.2</option>
                      <option value="1.4">1.4</option>
                      <option value="1.6">1.6</option>
                      <option value="1.8">1.8</option>
                      <option value="2.0">2.0</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Page Margins
                    </label>
                    <select
                      value={templateSettings.pageMargins}
                      onChange={(e) => setTemplateSettings(prev => ({ ...prev, pageMargins: e.target.value }))}
                      className="input-field"
                    >
                      <option value="0.5in">0.5 inch</option>
                      <option value="0.75in">0.75 inch</option>
                      <option value="1in">1 inch</option>
                      <option value="1.25in">1.25 inch</option>
                      <option value="1.5in">1.5 inch</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={templateSettings.headerEnabled}
                        onChange={(e) => setTemplateSettings(prev => ({ ...prev, headerEnabled: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Enable Header</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={templateSettings.footerEnabled}
                        onChange={(e) => setTemplateSettings(prev => ({ ...prev, footerEnabled: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Enable Footer</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={templateSettings.pageNumbers}
                        onChange={(e) => setTemplateSettings(prev => ({ ...prev, pageNumbers: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Page Numbers</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Watermark Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={templateSettings.watermark}
                      onChange={(e) => setTemplateSettings(prev => ({ ...prev, watermark: e.target.value }))}
                      className="input-field"
                      placeholder="Enter watermark text"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Template Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Template Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleCopyTemplate}
                className="btn-secondary flex items-center justify-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Template
              </button>
              
              <button
                onClick={handleExportTemplate}
                className="btn-secondary flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Template
              </button>
              
              <label className="btn-secondary flex items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTemplate}
                  className="hidden"
                />
                <FileText className="h-4 w-4 mr-2" />
                Import Template
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="card p-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 mb-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 mb-4">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                  Creating Template...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Template
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Help */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">How to Use</h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>1. <strong>Name your document</strong> - Give it a descriptive name</p>
              <p>2. <strong>Add custom fields</strong> - Enter field names (tags are auto-generated)</p>
              <p>3. <strong>Choose a theme</strong> - Select from predefined professional templates</p>
              <p>4. <strong>Write your content</strong> - Use the rich text editor to create your document</p>
              <p>5. <strong>Insert placeholders</strong> - Use the dropdown to add placeholders where you want dynamic content</p>
              <p>6. <strong>Configure settings</strong> - Set font, margins, and other formatting options</p>
              <p>7. <strong>Preview</strong> - Switch to preview mode to see how it looks with sample data</p>
              <p>8. <strong>Export/Import</strong> - Share templates with other HR users</p>
              <p>9. <strong>Save</strong> - Create your template for future use</p>
            </div>
          </div>

          <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">Tips</h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>• Use clear, descriptive field names</li>
              <li>• Field tags are automatically generated from field names</li>
              <li>• Test your template with preview mode</li>
              <li>• Use formatting to make your documents look professional</li>
              <li>• Choose from pre-built themes for common HR documents</li>
              <li>• Export templates to share with other HR users</li>
              <li>• Use advanced settings for custom formatting</li>
              <li>• Collapse sidebar for more screen space</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Document Themes Modal */}
      {showThemes && (
        <DocumentThemes
          onSelectTheme={handleThemeSelect}
          onClose={() => setShowThemes(false)}
        />
      )}
    </div>
  )
}

export default CreateTemplate 