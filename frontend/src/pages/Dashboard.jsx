import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Building,
  Clock,
  FileText,
  Bell,
  Plus,
  RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const Dashboard = () => {
  const { user, API_BASE_URL } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    activeProjects: 0,
    leaveRequests: 0, // Fixed: Added default value
    totalPayroll: 0,
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

      console.log('🔍 Fetching dashboard data...')

      // Fetch dashboard data from centralized endpoint
      const dashboardResponse = await fetch(`${API_BASE_URL}/users/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('🔍 Dashboard response status:', dashboardResponse.status)

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        console.log('🔍 Dashboard data received:', dashboardData)
        
        // Update state with dashboard data
        setDashboardData({
          totalEmployees: dashboardData.stats?.totalEmployees || 0,
          activeProjects: dashboardData.stats?.activeProjects || 0,
          leaveRequests: dashboardData.stats?.leaveRequests || 0,
          totalPayroll: dashboardData.stats?.totalPayroll || 0,
          recentEmployees: dashboardData.recentEmployees || [],
          companyInfo: dashboardData.companyInfo || null
        })
      } else {
        // Fallback to individual endpoints if dashboard fails
        console.log('Dashboard endpoint failed, using fallback...')
        
        // Try to fetch employees from main endpoint first
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
            console.log('Using mock employees data for development')
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
          console.error('Error fetching employees:', error)
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
          console.error('Error fetching company profile:', error)
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
        const totalPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0)
        
        // Get recent employees (last 5)
        const recentEmployees = employees
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)

        setDashboardData({
          totalEmployees,
          activeProjects: 0, // Placeholder - can be expanded later
          leaveRequests: 0,
          totalPayroll,
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
      console.error('Error fetching dashboard data:', error)
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

  console.log('🔍 Current dashboardData:', dashboardData)

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
      name: 'Active Projects',
      value: (dashboardData.activeProjects || 0).toString(),
      change: '+0%',
      changeType: 'neutral',
      icon: TrendingUp,
      color: 'from-emerald-600 to-emerald-700'
    },
    {
      name: 'Leave Requests',
      value: (dashboardData.leaveRequests || 0).toString(),
      change: '+0%',
      changeType: 'neutral',
      icon: Calendar,
      color: 'from-amber-600 to-amber-700'
    },
    {
      name: 'Total Payroll',
      value: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
      }).format(dashboardData.totalPayroll || 0),
      change: '+0%',
      changeType: 'neutral',
      icon: DollarSign,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold dark:text-white">HR DASHBOARD</h1>
        <p className="text-blue-100 dark:text-gray-300">
          Welcome to your HR Management System
        </p>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          <strong>Debug Info:</strong> Current time: {currentTime.toLocaleTimeString()} | 
          User role: HR Manager | Session active
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div key={stat.name} className="stats-card card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black dark:text-gray-400">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {loading ? (
                    <div className="loading-spinner h-6 w-6"></div>
                  ) : (
                    stat.value
                  )}
                </p>
                <p className={`text-sm ${
                  stat.changeType === 'positive' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : stat.changeType === 'negative'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {stat.change} from last month
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Company Information
            </h3>
            <button
              onClick={handleRefresh}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
          {dashboardData.companyInfo ? (
            <div className="space-y-3">
              <div className="flex items-center text-black dark:text-gray-400">
                <Building className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
                <span>{dashboardData.companyInfo?.name || 'Your Company Name'}</span>
              </div>
              <div className="flex items-center text-black dark:text-gray-400">
                <Clock className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
                <span>Established: {dashboardData.companyInfo?.established || '[Year]'}</span>
              </div>
              <div className="flex items-center text-black dark:text-gray-400">
                <Users className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
                <span>{dashboardData.totalEmployees} Employees</span>
              </div>
              <div className="flex items-center text-black dark:text-gray-400">
                <DollarSign className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
                <span>Annual Revenue: {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 0
                }).format(dashboardData.companyInfo?.revenue || 0)}</span>
              </div>
              <div className="flex items-center text-black dark:text-gray-400">
                <Building className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
                <span>Location: {dashboardData.companyInfo?.location || 'Not specified'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                Company profile not set up yet
              </p>
              <a
                href="/company-profile"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Set Up Company Profile
              </a>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className="w-full flex items-center p-3 rounded-lg border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-r ${action.color} mr-3`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-black dark:text-white">
                    {action.name}
                  </p>
                  <p className="text-sm text-black dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Employees */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
          Recent Employees
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner h-8 w-8"></div>
          </div>
        ) : dashboardData.recentEmployees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-black dark:text-gray-400">No employees yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Employees will appear here once added to the system</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.recentEmployees.map((employee) => (
              <div key={employee.id} className="card p-4 hover:shadow-medium transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold mr-3">
                    {employee.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {employee.full_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {employee.department}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Joined: {formatDate(employee.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
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
  )
}

export default Dashboard 