import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Clock, 
  Calendar, 
  FileText,
  Building,
  DollarSign,
  Bell,
  Plus,
  RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import CalendarWidget from '../components/CalendarWidget'
import RoleUpdater from '../components/RoleUpdater'

const Dashboard = () => {
  const { user, API_BASE_URL } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    pendingLeaveRequests: 0,
    leaveRequests: 0,
    salarySlipsGenerated: 0,
    recentEmployees: [],
    companyInfo: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      // Fetch dashboard data from centralized endpoint
      const dashboardResponse = await fetch(`${API_BASE_URL}/users/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        
        // Update state with dashboard data
        setDashboardData({
          totalEmployees: dashboardData.stats?.totalEmployees || 0,
          pendingLeaveRequests: dashboardData.stats?.pendingLeaveRequests || 0,
          leaveRequests: dashboardData.stats?.leaveRequests || 0,
          salarySlipsGenerated: dashboardData.stats?.salarySlipsGenerated || 0,
          recentEmployees: dashboardData.recentEmployees || [],
          companyInfo: dashboardData.companyInfo || null
        })
      } else {
        // Fallback to individual endpoints if dashboard fails
        let employees = []
        try {
          const employeesResponse = await fetch(`${API_BASE_URL}/users/employees`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (employeesResponse.ok) {
            const employeesData = await employeesResponse.json()
            employees = employeesData.employees || []
          } else {
            // Fallback to mock data
            const mockResponse = await fetch(`${API_BASE_URL}/users/mock/employees`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (mockResponse.ok) {
              const mockData = await mockResponse.json()
              employees = mockData.employees || []
            }
          }
        } catch (error) {
          // Use mock data as fallback
          employees = [
            {
              id: 'emp-1',
              full_name: 'John Doe',
              email: 'john.doe@company.com',
              department: 'Engineering',
              designation: 'Senior Developer',
              salary: 75000,
              joining_date: '2023-01-15',
              leave_balance: 15,
              created_at: '2023-01-15T00:00:00Z'
            },
            {
              id: 'emp-2',
              full_name: 'Jane Smith',
              email: 'jane.smith@company.com',
              department: 'Marketing',
              designation: 'Marketing Manager',
              salary: 65000,
              joining_date: '2023-02-20',
              leave_balance: 20,
              created_at: '2023-02-20T00:00:00Z'
            }
          ]
        }

        // Fetch pending leave requests
        let pendingLeaveRequests = 0
        try {
          const leaveResponse = await fetch(`${API_BASE_URL}/leaves/requests?status=pending`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (leaveResponse.ok) {
            const leaveData = await leaveResponse.json()
            pendingLeaveRequests = Array.isArray(leaveData) ? leaveData.length : 0
          }
        } catch (error) {
          // Continue with 0 if leave requests fail
        }

        // Fetch salary slips generated this month
        let salarySlipsGenerated = 0
        try {
          const currentMonth = new Date().getMonth() + 1
          const currentYear = new Date().getFullYear()
          const salaryResponse = await fetch(`${API_BASE_URL}/salary/all`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (salaryResponse.ok) {
            const salaryData = await salaryResponse.json()
            const currentMonthSlips = (salaryData.salarySlips || []).filter(slip => 
              slip.month === currentMonth && slip.year === currentYear
            )
            salarySlipsGenerated = currentMonthSlips.length
          }
        } catch (error) {
          // Continue with 0 if salary slips fail
        }

        // Fetch company profile
        let companyInfo = null
        try {
          const companyResponse = await fetch(`${API_BASE_URL}/users/company/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (companyResponse.ok) {
            const companyData = await companyResponse.json()
            companyInfo = companyData.company
          } else {
            // Fallback to mock company data
            const mockCompanyResponse = await fetch(`${API_BASE_URL}/users/mock/company`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (mockCompanyResponse.ok) {
              const mockCompanyData = await mockCompanyResponse.json()
              companyInfo = mockCompanyData.company
            }
          }
        } catch (error) {
          // Use mock company data as fallback
          companyInfo = {
            name: 'Test Company Ltd.',
            address: '123 Business Street, Tech City, TC 12345',
            phone: '+1 (555) 123-4567',
            email: 'contact@testcompany.com',
            website: 'https://testcompany.com'
          }
        }

        // Calculate dashboard metrics
        const totalEmployees = employees.length
        
        // Get recent employees (last 5)
        const recentEmployees = employees
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)

        setDashboardData({
          totalEmployees,
          pendingLeaveRequests,
          leaveRequests: 0,
          salarySlipsGenerated,
          recentEmployees,
          companyInfo: companyInfo ? {
            name: companyInfo.name,
            established: companyInfo.founded_year || new Date().getFullYear(),
            employees: totalEmployees,
            location: companyInfo.address || 'Not specified'
          } : null
        })
      }
    } catch (error) {
      toast.error('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const handleRefresh = () => {
    fetchDashboardData()
    toast.success('Dashboard refreshed!')
  }

  const stats = [
    {
      name: 'Total Employees',
      value: (dashboardData.totalEmployees || 0).toString(),
      change: '+0%',
      changeType: 'neutral',
      icon: Users,
      color: 'from-blue-600 to-blue-700'
    },
    {
      name: 'Pending Leave Requests',
      value: (dashboardData.pendingLeaveRequests || 0).toString(),
      change: '+0%',
      changeType: 'neutral',
      icon: Clock,
      color: 'from-amber-600 to-amber-700'
    },
    {
      name: 'Leave Requests',
      value: (dashboardData.leaveRequests || 0).toString(),
      change: '+0%',
      changeType: 'neutral',
      icon: Calendar,
      color: 'from-emerald-600 to-emerald-700'
    },
    {
      name: 'Salary Slips Generated',
      value: (dashboardData.salarySlipsGenerated || 0).toString(),
      change: '+0%',
      changeType: 'neutral',
      icon: FileText,
      color: 'from-cyan-600 to-cyan-700'
    }
  ]

  const quickActions = [
    {
      name: 'Add Employee',
      description: 'Create new employee profile',
      icon: Users,
      color: 'from-blue-600 to-blue-700',
      href: '/add-employee'
    },
    ...(user?.role === 'admin' ? [{
      name: 'Add HR Staff',
      description: 'Create HR and HR Manager accounts',
      icon: Users,
      color: 'from-purple-600 to-purple-700',
      href: '/add-hr-staff'
    }] : []),
    {
      name: 'View Reports',
      description: 'Generate HR reports',
      icon: FileText,
      color: 'from-emerald-600 to-emerald-700',
      href: '/reports'
    },
    {
      name: 'Manage Leave',
      description: 'Review and approve leave requests',
      icon: Calendar,
      color: 'from-amber-600 to-amber-700',
      href: '/leave-management'
    }
  ]

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">WorkFlowHR Dashboard</h1>
            <p className="text-blue-100 text-lg">
              Welcome to your Human Resource Management System
            </p>
            <p className="text-blue-200 text-sm mt-2">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} • {currentTime.toLocaleTimeString()}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleRefresh}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 backdrop-blur-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? (
                    <div className="loading-spinner h-8 w-8"></div>
                  ) : (
                    stat.value
                  )}
                </p>
                <p className={`text-sm mt-1 ${
                  stat.changeType === 'positive' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : stat.changeType === 'negative'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {stat.change} from last month
                </p>
              </div>
              <div className={`p-4 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                <stat.icon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Company Information
              </h3>
            </div>
          </div>
          <div className="p-6">
            {dashboardData.companyInfo ? (
              <div className="space-y-4">
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Building className="h-5 w-5 mr-3 text-blue-500" />
                  <span className="font-medium">{dashboardData.companyInfo?.name || 'Your Company Name'}</span>
                </div>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Clock className="h-5 w-5 mr-3 text-green-500" />
                  <span>Established: {dashboardData.companyInfo?.established || '[Year]'}</span>
                </div>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Users className="h-5 w-5 mr-3 text-purple-500" />
                  <span>{dashboardData.totalEmployees} Employees</span>
                </div>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-5 w-5 mr-3 text-yellow-500" />
                  <span>Status: Active</span>
                </div>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Building className="h-5 w-5 mr-3 text-indigo-500" />
                  <span>Location: {dashboardData.companyInfo?.location || 'Not specified'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
                  Company profile not set up yet
                </p>
                <Link
                  to="/company-profile"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Set Up Company Profile
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  to={action.href}
                  className="block p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600"
                >
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${action.color} mr-4 shadow-lg`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {action.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Role Updater - Development Tool */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Development Tools
          </h3>
        </div>
        <div className="p-6">
          <RoleUpdater />
        </div>
      </div>

      {/* Calendar Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upcoming Events
          </h3>
        </div>
        <div className="p-6">
          <CalendarWidget limit={3} />
        </div>
      </div>

      {/* Recent Employees */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Employees
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner h-8 w-8"></div>
            </div>
          ) : dashboardData.recentEmployees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No employees yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Employees will appear here once added to the system
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardData.recentEmployees.map((employee) => (
                <div key={employee.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-lg mr-4">
                      {employee.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {employee.full_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {employee.department}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Joined: {formatDate(employee.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard 