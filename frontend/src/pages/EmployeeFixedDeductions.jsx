import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Percent,
  Hash
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function EmployeeFixedDeductions() {
  const { employee_id } = useParams()
  const navigate = useNavigate()
  const { user, API_BASE_URL } = useAuth()
  const [deductions, setDeductions] = useState([])
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDeduction, setSelectedDeduction] = useState(null)
  const [formData, setFormData] = useState({
    deduction_name: '',
    deduction_type: 'fixed',
    amount: '',
    percentage: '',
    description: ''
  })

  // Fetch employee and deductions data
  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      // Fetch employee details
              const employeeResponse = await fetch(`${API_BASE_URL}/employees/${employee_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json()
        setEmployee(employeeData.employee)
      }

      // Fetch fixed deductions
      const deductionsResponse = await fetch(`${API_BASE_URL}/salary/fixed-deductions/${employee_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (deductionsResponse.ok) {
        const deductionsData = await deductionsResponse.json()
        setDeductions(deductionsData.deductions || [])
      }

    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [employee_id])

  const handleAddDeduction = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_BASE_URL}/salary/fixed-deductions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          employee_id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add fixed deduction')
      }

      toast.success('Fixed deduction added successfully!')
      setShowAddModal(false)
      setFormData({
        deduction_name: '',
        deduction_type: 'fixed',
        amount: '',
        percentage: '',
        description: ''
      })
      fetchData()
    } catch (error) {
      toast.error(error.message || 'Failed to add fixed deduction')
    }
  }

  const handleEditDeduction = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_BASE_URL}/salary/fixed-deductions/${selectedDeduction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update fixed deduction')
      }

      toast.success('Fixed deduction updated successfully!')
      setShowEditModal(false)
      setSelectedDeduction(null)
      setFormData({
        deduction_name: '',
        deduction_type: 'fixed',
        amount: '',
        percentage: '',
        description: ''
      })
      fetchData()
    } catch (error) {
      toast.error(error.message || 'Failed to update fixed deduction')
    }
  }

  const handleDeleteDeduction = async (deductionId) => {
    if (!window.confirm('Are you sure you want to delete this fixed deduction?')) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_BASE_URL}/salary/fixed-deductions/${deductionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete fixed deduction')
      }

      toast.success('Fixed deduction deleted successfully!')
      fetchData()
    } catch (error) {
      toast.error(error.message || 'Failed to delete fixed deduction')
    }
  }

  const openEditModal = (deduction) => {
    setSelectedDeduction(deduction)
    setFormData({
      deduction_name: deduction.deduction_name,
      deduction_type: deduction.deduction_type,
      amount: deduction.amount.toString(),
      percentage: deduction.percentage.toString(),
      description: deduction.description || ''
    })
    setShowEditModal(true)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
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
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <DollarSign className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Fixed Deductions
                </h1>
                {employee && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {employee.full_name} - {employee.department}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Fixed Deduction
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Fixed Deductions List */}
        <div className="card">
          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="loading-spinner h-8 w-8"></div>
              </div>
            ) : deductions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No fixed deductions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Add fixed deductions like Professional Tax, Insurance, etc.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add First Fixed Deduction
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {deductions.map((deduction) => (
                  <div key={deduction.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {deduction.deduction_name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {deduction.deduction_type === 'fixed' ? 'Fixed Amount' : 'Percentage Based'}
                            {deduction.description && ` • ${deduction.description}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {deduction.deduction_type === 'fixed' 
                            ? formatCurrency(deduction.amount)
                            : `${deduction.percentage}%`
                          }
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {deduction.deduction_type === 'fixed' ? 'Fixed Amount' : 'Percentage'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(deduction)}
                          className="btn-secondary flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDeduction(deduction.id)}
                          className="btn-danger flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          deduction.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {deduction.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Created: {new Date(deduction.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Fixed Deduction Modal */}
      {showAddModal && (
        <FixedDeductionModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddDeduction}
          onClose={() => setShowAddModal(false)}
          title="Add Fixed Deduction"
          submitText="Add Deduction"
        />
      )}

      {/* Edit Fixed Deduction Modal */}
      {showEditModal && selectedDeduction && (
        <FixedDeductionModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEditDeduction}
          onClose={() => {
            setShowEditModal(false)
            setSelectedDeduction(null)
          }}
          title="Edit Fixed Deduction"
          submitText="Update Deduction"
        />
      )}
    </div>
  )
}

// Fixed Deduction Modal Component
function FixedDeductionModal({ formData, setFormData, onSubmit, onClose, title, submitText }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="form-label">Deduction Name *</label>
              <input
                type="text"
                name="deduction_name"
                value={formData.deduction_name}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="e.g., Professional Tax, Insurance"
              />
            </div>

            <div>
              <label className="form-label">Deduction Type *</label>
              <select
                name="deduction_type"
                value={formData.deduction_type}
                onChange={handleInputChange}
                required
                className="input-field"
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage of Salary</option>
              </select>
            </div>

            {formData.deduction_type === 'fixed' ? (
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="200.00"
                />
              </div>
            ) : (
              <div>
                <label className="form-label">Percentage (%) *</label>
                <input
                  type="number"
                  name="percentage"
                  value={formData.percentage}
                  onChange={handleInputChange}
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  className="input-field"
                  placeholder="5.00"
                />
              </div>
            )}

            <div>
              <label className="form-label">Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="input-field"
                placeholder="Brief description of this deduction..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center"
              >
                {formData.deduction_type === 'fixed' ? (
                  <Hash className="h-4 w-4 mr-2" />
                ) : (
                  <Percent className="h-4 w-4 mr-2" />
                )}
                {submitText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 