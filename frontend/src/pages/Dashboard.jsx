import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
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
  const { user } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    activeProjects: 0,
    leaveRequests: 0,
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

      // Fetch employees
      const employeesResponse = await fetch('http://localhost:3000/api/users/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!employeesResponse.ok) {
        if (employeesResponse.status === 401) {
          toast.error('Session expired. Please login again.')
          return
        }
        throw new Error('Failed to fetch employees')
      }

      const employeesData = await employeesResponse.json()
      const employees = employeesData.employees || []

      // Fetch company profile
      let companyInfo = null
      try {
        const companyResponse = await fetch('http://localhost:3000/api/users/company/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (companyResponse.ok) {
          const companyData = await companyResponse.json()
          companyInfo = companyData.company
        }
      } catch (error) {
        console.error('Error fetching company profile:', error)
        // Continue without company info
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
        leaveRequests: 0, // Placeholder - can be expanded later
        totalPayroll,
        recentEmployees,
        companyInfo: companyInfo ? {
          name: companyInfo.name,
          established: companyInfo.founded_year || new Date().getFullYear(),
          employees: totalEmployees,
          revenue: totalPayroll * 12 // Rough estimate
        } : {
          name: 'Your Company',
          established: new Date().getFullYear(),
          employees: totalEmployees,
          revenue: totalPayroll * 12
        }
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const stats = [
    {
      name: 'Total Employees',
      value: dashboardData.totalEmployees.toString(),
      change: '+0%',
      changeType: 'neutral',
      icon: Users,
      color: 'from-blue-600 to-blue-700'
    },
    {
      name: 'Active Projects',
      value: dashboardData.activeProjects.toString(),
      change: '+0%',
      changeType: 'neutral',
      icon: TrendingUp,
      color: 'from-emerald-600 to-emerald-700'
    },
    {
      name: 'Leave Requests',
      value: dashboardData.leaveRequests.toString(),
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
      }).format(dashboardData.totalPayroll),
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
    {
      name: 'View Reports',
      description: 'Generate HR reports',
      icon: FileText,
      color: 'from-emerald-600 to-emerald-700',
      href: '/reports'
    },
    {
      name: 'Manage Leave',
      description: 'Process leave requests',
      icon: Calendar,
      color: 'from-amber-600 to-amber-700',
      href: '/leave'
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
              onClick={fetchDashboardData}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
          {dashboardData.companyInfo?.name === 'Your Company' ? (
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
          ) : (
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
              <button
                key={action.name}
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
              </button>
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