import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Users, 
  UserCheck, 
  Calendar, 
  TrendingUp, 
  Plus, 
  BarChart3, 
  Calendar as CalendarIcon,
  Building,
  Mail,
  Shield,
  Clock
} from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    thisMonth: 0,
    growthRate: 0
  })

  useEffect(() => {
    // Simulate loading stats
    setTimeout(() => {
      setStats({
        totalEmployees: 24,
        activeEmployees: 22,
        thisMonth: 3,
        growthRate: 12.5
      })
    }, 1000)
  }, [])

  const quickActions = [
    {
      title: 'Add Employee',
      description: 'Add a new employee to the system',
      icon: Plus,
      color: 'from-blue-500 to-blue-600',
      href: '/employees'
    },
    {
      title: 'View Reports',
      description: 'Generate and view reports',
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600',
      href: '/reports'
    },
    {
      title: 'Schedule Meeting',
      description: 'Schedule team meetings',
      icon: CalendarIcon,
      color: 'from-emerald-500 to-emerald-600',
      href: '/meetings'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full mb-4 shadow-lg">
          <strong className="text-sm font-semibold">HR DASHBOARD</strong>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome Back, {user?.full_name}!
        </h1>
        <p className="text-gray-600 text-lg">
          Here's what's happening with your team today
        </p>
        {/* Debug Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Debug Info:</strong> User Role: {user?.role || 'undefined'} | 
            User ID: {user?.id || 'undefined'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
              <p className="text-sm text-emerald-600 font-medium">+12% from last month</p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Employees</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeEmployees}</p>
              <p className="text-sm text-emerald-600 font-medium">+5% from last month</p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-3xl font-bold text-gray-900">{stats.thisMonth}</p>
              <p className="text-sm text-emerald-600 font-medium">+8% from last month</p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Growth Rate</p>
              <p className="text-3xl font-bold text-gray-900">{stats.growthRate}%</p>
              <p className="text-sm text-emerald-600 font-medium">+2% from last month</p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Company Name</p>
                  <p className="text-gray-900">Your Company</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Your Role</p>
                  <p className="text-gray-900 capitalize">{user?.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="text-gray-900">N/A</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="group relative p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg transition-all duration-200 text-left"
              >
                <div className={`h-12 w-12 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h4>
                <p className="text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 