import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, ArrowLeft, Plus, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AddHRStaff() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'hr' // Default to HR
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Check authentication and permissions on component mount
  useEffect(() => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to create HR staff')
      navigate('/login')
      return
    }

    // Check if user has permission to add HR staff
    if (!['admin', 'hr_manager'].includes(user.role)) {
      toast.error('Only Admin and HR Manager can create HR staff')
      navigate('/dashboard')
      return
    }
  }, [isAuthenticated, user, navigate])

  // If not authenticated, don't render the component
  if (!isAuthenticated || !user || !['admin', 'hr_manager'].includes(user.role)) {
    return null
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError('Full name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate form
      if (!validateForm()) {
        return
      }

      // Get token from localStorage
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Authentication token not found. Please login again.')
      }

      // Determine the API endpoint based on role
      const endpoint = formData.role === 'hr_manager' 
        ? 'http://localhost:3000/api/auth/add-hr-manager'
        : 'http://localhost:3000/api/auth/add-hr-staff'

      // Send to backend API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token')
          toast.error('Session expired. Please login again.')
          navigate('/login')
          return
        }
        throw new Error(result.error || 'Failed to create HR staff')
      }

      // Show success message
      setSuccess(`${formData.role === 'hr_manager' ? 'HR Manager' : 'HR Staff'} created successfully! 
        Email: ${result.user.email}
        Role: ${result.user.role}`)

      // Reset form
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'hr'
      })

      // Show toast notification
      toast.success(`${formData.role === 'hr_manager' ? 'HR Manager' : 'HR Staff'} created successfully!`)

    } catch (error) {
      setError(error.message || 'Failed to create HR staff')
      toast.error(error.message || 'Failed to create HR staff')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900 dark:text-white">Add HR Staff</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Add HR Staff</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Create new HR or HR Manager accounts with proper permissions
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Role Selection</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="role" className="form-label">
                    HR Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="hr">HR Staff</option>
                    {user.role === 'admin' && (
                      <option value="hr_manager">HR Manager</option>
                    )}
                  </select>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {formData.role === 'hr_manager' 
                      ? 'HR Managers can manage HR staff and have elevated permissions'
                      : 'HR Staff can manage employees and basic HR functions'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-300 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="full_name" className="form-label">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="form-label">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Enter email address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="password" className="form-label">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength="6"
                    className="input-field"
                    placeholder="Enter password (min 6 characters)"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    The user will use this password to login to the system
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                </div>
                <div className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800 p-3 rounded">
                  <p><strong>Next Steps:</strong></p>
                  <p>1. The new HR staff member can login using their email and password</p>
                  <p>2. They will have access to HR-specific features based on their role</p>
                  <p>3. They can start managing employees and HR functions immediately</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <>
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                  Creating HR Account...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create HR Account
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
} 