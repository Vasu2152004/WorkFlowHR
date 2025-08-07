import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  DollarSign, 
  Plus, 
  Eye, 
  Download, 
  Calendar,
  User,
  TrendingUp,
  TrendingDown,
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SalarySlips() {
  const navigate = useNavigate()
  const { user, API_BASE_URL } = useAuth()
  const [salarySlips, setSalarySlips] = useState([])
  const [employees, setEmployees] = useState([])
  const [salaryComponents, setSalaryComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [generatingSlip, setGeneratingSlip] = useState(false)

  // Fetch salary slips and related data
  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      // Fetch salary slips
      const slipsResponse = await fetch(`${API_BASE_URL}/salary/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (slipsResponse.ok) {
        const slipsData = await slipsResponse.json()
        setSalarySlips(slipsData.salarySlips || [])
      }

      // Fetch employees
      const employeesResponse = await fetch(`${API_BASE_URL}/users/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json()
        setEmployees(employeesData.employees || [])
      }

      // Fetch salary components
      const componentsResponse = await fetch(`${API_BASE_URL}/salary/components`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (componentsResponse.ok) {
        const componentsData = await componentsResponse.json()
        setSalaryComponents(componentsData.components || [])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleGenerateSalarySlip = async (formData) => {
    setGeneratingSlip(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`${API_BASE_URL}/salary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate salary slip')
      }

      toast.success('Salary slip generated successfully!')
      setShowGenerateModal(false)
      fetchData() // Refresh the list
    } catch (error) {
      console.error('Error generating salary slip:', error)
      toast.error(error.message || 'Failed to generate salary slip')
    } finally {
      setGeneratingSlip(false)
    }
  }

  const handleViewSlip = (slipId) => {
    navigate(`/salary-slip/${slipId}`)
  }

  const filteredSlips = salarySlips.filter(slip => {
    const matchesSearch = slip.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         slip.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMonth = !selectedMonth || slip.month === parseInt(selectedMonth)
    const matchesYear = slip.year === parseInt(selectedYear)
    return matchesSearch && matchesMonth && matchesYear
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900 dark:text-white">Salary Slips</h1>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Generate Salary Slip
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="card mb-6">
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by employee name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-field"
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="input-field"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                })}
              </select>

              <button
                onClick={fetchData}
                className="btn-secondary flex items-center justify-center"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Salary Slips List */}
        <div className="card">
          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="loading-spinner h-8 w-8"></div>
              </div>
            ) : filteredSlips.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No salary slips found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {searchTerm || selectedMonth ? 'Try adjusting your search or filters' : 'Generate your first salary slip'}
                </p>
                {!searchTerm && !selectedMonth && (
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    className="btn-primary"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Generate First Salary Slip
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSlips.map((slip) => (
                  <div key={slip.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-600 to-green-700 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {slip.employee?.full_name || 'Unknown Employee'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getMonthName(slip.month)} {slip.year} • {slip.employee?.department || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(slip.net_salary)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Net Salary
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewSlip(slip.id)}
                          className="btn-secondary flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </button>
                        <button className="btn-secondary flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Gross Salary</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(slip.gross_salary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Additions</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          +{formatCurrency(slip.total_additions)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Deductions</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">
                          -{formatCurrency(slip.total_deductions)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Unpaid Leaves</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {slip.unpaid_leaves} days
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Generate Salary Slip Modal */}
      {showGenerateModal && (
        <GenerateSalarySlipModal
          employees={employees}
          salaryComponents={salaryComponents}
          onGenerate={handleGenerateSalarySlip}
          onClose={() => setShowGenerateModal(false)}
          loading={generatingSlip}
        />
      )}
    </div>
  )
}

// Generate Salary Slip Modal Component
function GenerateSalarySlipModal({ employees, salaryComponents, onGenerate, onClose, loading }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    additions: [],
    deductions: [],
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.employee_id) {
      toast.error('Please select an employee')
      return
    }
    onGenerate(formData)
  }

  const addComponent = (type) => {
    const newComponent = {
      component_id: '',
      component_name: '',
      amount: '',
      description: ''
    }
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], newComponent]
    }))
  }

  const updateComponent = (type, index, field, value) => {
    setFormData(prev => {
      const updatedComponents = prev[type].map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // If component_id is being updated, also update component_name
          if (field === 'component_id' && value) {
            const selectedComponent = salaryComponents.find(comp => comp.id === value);
            if (selectedComponent) {
              updatedItem.component_name = selectedComponent.name;
            }
          }
          
          return updatedItem;
        }
        return item;
      });
      
      return {
        ...prev,
        [type]: updatedComponents
      };
    });
  }

  const removeComponent = (type, index) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Generate Salary Slip
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Employee *</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                  required
                  className="input-field"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Month *</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  required
                  className="input-field"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {getMonthName(i + 1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Year *</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  required
                  className="input-field"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Additions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Additions (Bonuses, Allowances, etc.)
                </h3>
                <button
                  type="button"
                  onClick={() => addComponent('additions')}
                  className="btn-secondary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.additions.map((addition, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded">
                    <select
                      value={addition.component_id}
                      onChange={(e) => updateComponent('additions', index, 'component_id', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select Component</option>
                      {salaryComponents.filter(c => c.component_type === 'addition').map(comp => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Component Name"
                      value={addition.component_name}
                      onChange={(e) => updateComponent('additions', index, 'component_name', e.target.value)}
                      className="input-field"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={addition.amount}
                      onChange={(e) => updateComponent('additions', index, 'amount', e.target.value)}
                      className="input-field"
                    />
                    <button
                      type="button"
                      onClick={() => removeComponent('additions', index)}
                      className="btn-danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Deductions (Tax, Insurance, etc.)
                </h3>
                <button
                  type="button"
                  onClick={() => addComponent('deductions')}
                  className="btn-secondary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.deductions.map((deduction, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded">
                    <select
                      value={deduction.component_id}
                      onChange={(e) => updateComponent('deductions', index, 'component_id', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select Component</option>
                      {salaryComponents.filter(c => c.component_type === 'deduction').map(comp => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Component Name"
                      value={deduction.component_name}
                      onChange={(e) => updateComponent('deductions', index, 'component_name', e.target.value)}
                      className="input-field"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={deduction.amount}
                      onChange={(e) => updateComponent('deductions', index, 'amount', e.target.value)}
                      className="input-field"
                    />
                    <button
                      type="button"
                      onClick={() => removeComponent('deductions', index)}
                      className="btn-danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="input-field"
                placeholder="Any additional notes for this salary slip..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner h-4 w-4 mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Generate Salary Slip
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Helper function
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1]
} 