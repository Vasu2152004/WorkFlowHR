import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Building, Briefcase, DollarSign, Calendar, Phone, MapPin, FileText, ArrowLeft, Plus, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios' // Added axios import

export default function AddEmployee() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department: '',
    designation: '',
    salary: '',
    joining_date: '',
    phone_number: '',
    address: '',
    emergency_contact: '',
    pan_number: '',
    bank_account: '',
    leave_balance: '20'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support',
    'Product Management',
    'Design',
    'Legal',
    'IT Support',
    'Research & Development'
  ]

  const designations = [
    'Software Engineer',
    'Senior Software Engineer',
    'Lead Engineer',
    'Engineering Manager',
    'Product Manager',
    'Marketing Manager',
    'Sales Representative',
    'HR Specialist',
    'HR Manager',
    'Financial Analyst',
    'Accountant',
    'Operations Manager',
    'Customer Support Specialist',
    'UI/UX Designer',
    'Legal Counsel',
    'IT Support Specialist',
    'Research Scientist',
    'Data Analyst',
    'Project Manager',
    'Business Analyst'
  ]

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to create employees')
      navigate('/login')
      return
    }

    // Check if user is HR
    if (user.role !== 'hr') {
      toast.error('Only HR can create employees')
      navigate('/dashboard')
      return
    }
  }, [isAuthenticated, user, navigate])

  // If not authenticated, don't render the component
  if (!isAuthenticated || !user || user.role !== 'hr') {
    return null
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateEmployeeId = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `EMP${timestamp}${random}`
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
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
    if (!formData.department.trim()) {
      setError('Department is required')
      return false
    }
    if (!formData.designation.trim()) {
      setError('Designation is required')
      return false
    }
    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      setError('Valid salary is required')
      return false
    }
    if (!formData.joining_date) {
      setError('Joining date is required')
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    // Salary validation
    const salary = parseFloat(formData.salary)
    if (isNaN(salary) || salary <= 0) {
      setError('Please enter a valid salary amount')
      return false
    }

    // Phone validation (if provided)
    if (formData.phone_number && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone_number.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number')
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

      // Create employee data
      const employeeData = {
        full_name: formData.full_name,
        email: formData.email,
        department: formData.department,
        designation: formData.designation,
        salary: parseFloat(formData.salary),
        joining_date: formData.joining_date,
        phone_number: formData.phone_number || null,
        address: formData.address || null,
        emergency_contact: formData.emergency_contact || null,
        pan_number: formData.pan_number || null,
        bank_account: formData.bank_account || null,
        leave_balance: parseInt(formData.leave_balance)
      }

      // Send to backend API
      const response = await fetch('http://localhost:3000/api/users/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(employeeData)
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
        throw new Error(result.error || 'Failed to create employee')
      }

      // Show success message with credentials
      setSuccess(`Employee created successfully! 
        Employee ID: ${result.employee.employee_id}
        Password: ${result.employee.password}
        Email sent to: ${result.employee.email}`)

      // Reset form
      setFormData({
        full_name: '',
        email: '',
        department: '',
        designation: '',
        salary: '',
        joining_date: '',
        phone_number: '',
        address: '',
        emergency_contact: '',
        pan_number: '',
        bank_account: '',
        leave_balance: '20'
      })

      // Show toast notification
      toast.success('Employee created successfully! Welcome email sent.')

    } catch (error) {
      console.error('Error creating employee:', error)
      setError(error.message || 'Failed to create employee')
      toast.error(error.message || 'Failed to create employee')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/employees')
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
              <Plus className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900 dark:text-white">Add New Employee</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Add New Employee</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Create a new employee account with login credentials
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Required Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Required Information</h3>
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

                <div>
                  <label htmlFor="department" className="form-label">
                    Department *
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="designation" className="form-label">
                    Designation *
                  </label>
                  <select
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="">Select designation</option>
                    {designations.map((designation) => (
                      <option key={designation} value={designation}>
                        {designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="salary" className="form-label">
                    Annual Salary (₹) *
                  </label>
                  <input
                    type="number"
                    id="salary"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="input-field"
                    placeholder="Enter annual salary"
                  />
                </div>

                <div>
                  <label htmlFor="joining_date" className="form-label">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    id="joining_date"
                    name="joining_date"
                    value={formData.joining_date}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center mb-4">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-300 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone_number" className="form-label">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label htmlFor="leave_balance" className="form-label">
                    Leave Balance
                  </label>
                  <input
                    type="number"
                    id="leave_balance"
                    name="leave_balance"
                    value={formData.leave_balance}
                    onChange={handleInputChange}
                    min="0"
                    max="365"
                    className="input-field"
                    placeholder="Enter leave balance"
                  />
                </div>

                <div>
                  <label htmlFor="emergency_contact" className="form-label">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    id="emergency_contact"
                    name="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter emergency contact"
                  />
                </div>

                <div>
                  <label htmlFor="pan_number" className="form-label">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    id="pan_number"
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter PAN number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="form-label">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="input-field"
                    placeholder="Enter address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="bank_account" className="form-label">
                    Bank Account Details
                  </label>
                  <textarea
                    id="bank_account"
                    name="bank_account"
                    value={formData.bank_account}
                    onChange={handleInputChange}
                    rows="2"
                    className="input-field"
                    placeholder="Enter bank account details"
                  />
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
                  <p>1. Welcome email has been sent to the employee</p>
                  <p>2. Employee can login using their email and system-generated password</p>
                  <p>3. Employee should change password after first login</p>
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
                  Creating Employee Account...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Employee Account
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
} 