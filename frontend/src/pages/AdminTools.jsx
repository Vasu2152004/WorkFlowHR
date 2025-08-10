import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-hot-toast'

const AdminTools = () => {
  const { user, API_BASE_URL } = useAuth()
  const [loading, setLoading] = useState(false)
  const [templateStats, setTemplateStats] = useState(null)
  const [cleanupResult, setCleanupResult] = useState(null)

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You need admin privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const checkTemplateStats = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/documents/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch template stats')
      }

      const data = await response.json()
      setTemplateStats(data.debug_info || {})
      toast.success('Template stats retrieved successfully')
    } catch (error) {
      console.error('Error checking template stats:', error)
      toast.error('Failed to check template stats')
    } finally {
      setLoading(false)
    }
  }

  const runCleanup = async () => {
    if (!confirm('This will permanently delete orphaned templates. Are you sure?')) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/documents/templates/cleanup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to run cleanup')
      }

      const data = await response.json()
      setCleanupResult(data)
      toast.success(`Cleanup completed: ${data.cleaned_count} templates cleaned`)
      
      // Refresh stats after cleanup
      setTimeout(checkTemplateStats, 1000)
    } catch (error) {
      console.error('Error running cleanup:', error)
      toast.error('Failed to run cleanup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Tools
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administrative tools for system maintenance and troubleshooting
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Isolation Check */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Template Company Isolation Check
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={checkTemplateStats}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Checking...' : 'Check Template Stats'}
              </button>

              {templateStats && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">Results:</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">User Company ID:</span> {templateStats.user_company_id}</p>
                    <p><span className="font-medium">Total Templates Found:</span> {templateStats.total_templates_found}</p>
                    <p><span className="font-medium">Valid Templates Returned:</span> {templateStats.valid_templates_returned}</p>
                    <p><span className="font-medium">Orphaned Templates Found:</span> {templateStats.orphaned_templates_found}</p>
                  </div>
                  
                  {templateStats.orphaned_templates_found > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                        ⚠️ Found {templateStats.orphaned_templates_found} templates without company_id. 
                        These may be causing the isolation issue.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cleanup Tools */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Cleanup Tools
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  <strong>Note:</strong> This tool will permanently delete templates that don't have a company_id assigned.
                  Use with caution and only if you're sure these templates are orphaned.
                </p>
              </div>

              <button
                onClick={runCleanup}
                disabled={loading}
                className="btn-danger w-full"
              >
                {loading ? 'Running Cleanup...' : 'Run Cleanup (Delete Orphaned Templates)'}
              </button>

              {cleanupResult && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">Cleanup Results:</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Action:</span> {cleanupResult.action}</p>
                    <p><span className="font-medium">Templates Cleaned:</span> {cleanupResult.cleaned_count}</p>
                    {cleanupResult.templates_cleaned && cleanupResult.templates_cleaned.length > 0 && (
                      <div>
                        <p className="font-medium">Cleaned Templates:</p>
                        <ul className="list-disc list-inside ml-2">
                          {cleanupResult.templates_cleaned.map((template, index) => (
                            <li key={index}>{template.name} (ID: {template.id})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            How to Fix Company Isolation Issues
          </h2>
          
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">1. Check Template Stats</h3>
              <p>Use the "Check Template Stats" button to see how many templates exist and if there are any orphaned ones.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">2. Run Cleanup (if needed)</h3>
              <p>If orphaned templates are found, use the cleanup tool to remove them. This will fix the isolation issue.</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">3. Verify Fix</h3>
              <p>After cleanup, check the stats again to confirm the issue is resolved.</p>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> The cleanup tool permanently deletes templates without company_id. 
                Make sure these are truly orphaned before proceeding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminTools
