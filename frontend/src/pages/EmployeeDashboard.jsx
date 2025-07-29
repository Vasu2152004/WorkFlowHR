import { useState, useEffect } from 'react'
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
  Plus
} from 'lucide-react'

const EmployeeDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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

      {/* Employee Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            Employee Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center text-black dark:text-gray-400">
              <User className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>Your Name</span>
            </div>
            <div className="flex items-center text-black dark:text-gray-400">
              <Building className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>Your Department</span>
            </div>
            <div className="flex items-center text-black dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-3 text-slate-500 dark:text-gray-500" />
              <span>Joined: [Date]</span>
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
    </div>
  )
}

export default EmployeeDashboard 