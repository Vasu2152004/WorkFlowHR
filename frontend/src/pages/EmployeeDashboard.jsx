import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Clock, 
  Calendar, 
  FileText, 
  TrendingUp,
  Building,
  User,
  Bell,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Eye,
  Users,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Download,
  RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const EmployeeDashboard = () => {
  const { user, API_BASE_URL } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [salarySlips, setSalarySlips] = useState([])
  const [loadingSlips, setLoadingSlips] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch employees from backend
  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      const response = await fetch(`${API_BASE_URL}/users/employees/view`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.')
          return
        }
        throw new Error('Failed to fetch employees')
      }

      const data = await response.json()
      setEmployees(data.employees || [])
      setFilteredEmployees(data.employees || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  // Fetch salary slips for current employee
  const fetchSalarySlips = async () => {
    setLoadingSlips(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      const response = await fetch(`${API_BASE_URL}/salary/my-slips`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.')
          return
        }
        throw new Error('Failed to fetch salary slips')
      }

      const data = await response.json()
      setSalarySlips(data.salarySlips || [])
    } catch (error) {
      console.error('Error fetching salary slips:', error)
      toast.error('Failed to fetch salary slips')
    } finally {
      setLoadingSlips(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
    fetchSalarySlips()
  }, [])

  // Filter employees
  useEffect(() => {
    let filtered = employees.filter(employee => {
      const matchesSearch = employee.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.designation?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDepartment = !selectedDepartment || employee.department === selectedDepartment
      
      return matchesSearch && matchesDepartment
    })

    setFilteredEmployees(filtered)
  }, [employees, searchTerm, selectedDepartment])

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee)
    setShowViewModal(true)
  }

  const handleViewSalarySlip = (slipId) => {
    // Navigate to salary slip detail page
    window.open(`/salary-slip/${slipId}`, '_blank');
  };

  const handleDownloadSalarySlip = async (slipId) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      const response = await fetch(`${API_BASE_URL}/salary/my-slips/${slipId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.')
          return
        }
        throw new Error('Failed to download salary slip')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `salary_slip_${slipId}.pdf` // Suggest a filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Salary slip downloaded successfully!')
    } catch (error) {
      console.error('Error downloading salary slip:', error)
      toast.error('Failed to download salary slip')
    }
  };

  const getDepartments = () => {
    const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))]
    return departments
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const quickActions = [
    {
      name: 'Clock In/Out',
      description: 'Record your attendance',
      icon: Clock,
      color: 'from-emerald-600 to-emerald-700',
      status: 'available'
    },
    {
      name: 'Request Leave',
      description: 'Submit leave application',
      icon: Calendar,
      color: 'from-blue-600 to-blue-700',
      status: 'available'
    },
    {
      name: 'View Payslip',
      description: 'Download salary slip',
      icon: FileText,
      color: 'from-cyan-600 to-cyan-700',
      status: 'available'
    },
    {
      name: 'Take Break',
      description: 'Start break timer',
      icon: Clock,
      color: 'from-amber-600 to-amber-700',
      status: 'available'
    }
  ]

  const stats = [
    {
      name: 'Attendance',
      value: '0%',
      icon: Clock,
      color: 'from-emerald-600 to-emerald-700',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900'
    },
    {
      name: 'Leave Balance',
      value: '0 days',
      icon: Calendar,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50 dark:bg-gray-700'
    },
    {
      name: 'Performance',
      value: 'N/A',
      icon: TrendingUp,
      color: 'from-cyan-600 to-cyan-700',
      bgColor: 'bg-cyan-50 dark:bg-gray-700'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold dark:text-white">EMPLOYEE DASHBOARD</h1>
        <p className="text-blue-100 dark:text-gray-300">
          Welcome back! Here's your work summary
        </p>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          <strong>Debug Info:</strong> Current time: {currentTime.toLocaleTimeString()} | 
          User role: Employee | Session active
        </p>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {quickActions.map((action) => (
          <button
            key={action.name}
            className="card p-4 text-center hover:shadow-medium transition-all duration-300"
          >
            <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${action.color} mb-3`}>
              <action.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-black dark:text-white mb-1">
              {action.name}
            </h3>
            <p className="text-xs text-black dark:text-gray-400">
              {action.description}
            </p>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            Today's Tasks
          </h3>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-black dark:text-gray-400">No tasks assigned</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Tasks will appear here when assigned</p>
          </div>
        </div>

        {/* My Stats */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            My Stats
          </h3>
          <div className="space-y-4">
            {stats.map((stat) => (
              <div key={stat.name} className={`p-4 rounded-lg ${stat.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-gray-400">
                      {stat.name}
                    </p>
                    <p className="text-xl font-bold text-black dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            Upcoming Events
          </h3>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-black dark:text-gray-400">No upcoming events</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Events will appear here when scheduled</p>
          </div>
        </div>
      </div>

      {/* Salary Slips Section */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              My Salary Slips
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and download your salary slips
            </p>
          </div>
          <button
            onClick={fetchSalarySlips}
            disabled={loadingSlips}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingSlips ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingSlips ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Loading salary slips...</p>
          </div>
        ) : salarySlips.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-black dark:text-gray-400">No salary slips found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Salary slips will appear here once generated by HR
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {salarySlips.map((slip) => (
              <div key={slip.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-600 to-green-700 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {new Date(slip.year, slip.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Net Salary: ₹{slip.net_salary?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Generated on: {new Date(slip.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewSalarySlip(slip.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      <Eye className="h-3 w-3" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSalarySlip(slip.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Directory */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Company Directory
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View your colleagues ({filteredEmployees.length} employees)
            </p>
          </div>
          <button
            onClick={fetchEmployees}
            className="btn-secondary flex items-center"
          >
            <Users className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="input-field"
          >
            <option value="">All Departments</option>
            {getDepartments().map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            {filteredEmployees.length} employees found
          </div>
        </div>

        {/* Employee List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner h-8 w-8"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm || selectedDepartment ? 'No employees found' : 'No employees yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || selectedDepartment 
                ? 'Try adjusting your search or filters'
                : 'Employees will appear here once added to the system'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="card p-4 hover:shadow-medium transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold mr-3">
                      {employee.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {employee.full_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {employee.designation}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewEmployee(employee)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="h-3 w-3 mr-2" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Building className="h-3 w-3 mr-2" />
                    <span>{employee.department}</span>
                  </div>
                  {employee.phone_number && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="h-3 w-3 mr-2" />
                      <span>{employee.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            Employee Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center text-black dark:text-gray-400">
              <User className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>{user?.full_name || 'Your Name'}</span>
            </div>
            <div className="flex items-center text-black dark:text-gray-400">
              <Building className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>{user?.department || 'Your Department'}</span>
            </div>
            <div className="flex items-center text-black dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>Joined: {user?.created_at ? formatDate(user.created_at) : '[Date]'}</span>
            </div>
            <div className="flex items-center text-black dark:text-gray-400">
              <TrendingUp className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>Performance Rating: N/A</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-black dark:text-gray-400">No recent activity</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Activities will appear here once you start using the system</p>
          </div>
        </div>
      </div>

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-strong max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Employee Details
                </h3>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedEmployee(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold mr-4">
                  {selectedEmployee.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {selectedEmployee.full_name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedEmployee.designation}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                  <p className="text-gray-900 dark:text-white">{selectedEmployee.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</label>
                  <p className="text-gray-900 dark:text-white">{selectedEmployee.department}</p>
                </div>
                {selectedEmployee.phone_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="text-gray-900 dark:text-white">{selectedEmployee.phone_number}</p>
                  </div>
                )}
                {selectedEmployee.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                    <p className="text-gray-900 dark:text-white">{selectedEmployee.address}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Joined</label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedEmployee.created_at ? formatDate(selectedEmployee.created_at) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeDashboard 