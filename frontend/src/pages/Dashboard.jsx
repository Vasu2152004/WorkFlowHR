import { useState, useEffect } from 'react'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Building,
  Clock,
  FileText,
  Bell,
  Plus
} from 'lucide-react'

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const stats = [
    {
      name: 'Total Employees',
      value: '0',
      change: '0%',
      changeType: 'neutral',
      icon: Users,
      color: 'from-blue-600 to-blue-700'
    },
    {
      name: 'Active Projects',
      value: '0',
      change: '0%',
      changeType: 'neutral',
      icon: TrendingUp,
      color: 'from-emerald-600 to-emerald-700'
    },
    {
      name: 'Leave Requests',
      value: '0',
      change: '0%',
      changeType: 'neutral',
      icon: Calendar,
      color: 'from-amber-600 to-amber-700'
    },
    {
      name: 'Total Payroll',
      value: '$0',
      change: '0%',
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
      href: '/employees'
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
                  {stat.value}
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
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            Company Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center text-black dark:text-gray-400">
              <Building className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>Your Company Name</span>
            </div>
            <div className="flex items-center text-black dark:text-gray-400">
              <Clock className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>Established: [Year]</span>
            </div>
            <div className="flex items-center text-black dark:text-gray-400">
              <Users className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>0 Employees</span>
            </div>
            <div className="flex items-center text-black dark:text-gray-400">
              <DollarSign className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>Annual Revenue: $0</span>
            </div>
          </div>
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