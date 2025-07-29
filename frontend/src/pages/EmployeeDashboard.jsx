import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  User, 
  Bell, 
  Settings,
  TrendingUp,
  Target,
  Award,
  Zap,
  Star,
  Activity,
  Briefcase,
  DollarSign,
  Heart,
  Play,
  Pause,
  Coffee,
  Mail
} from 'lucide-react'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [employeeData, setEmployeeData] = useState({
    clockIn: '09:00 AM',
    clockOut: '05:00 PM',
    currentTime: new Date().toLocaleTimeString(),
    isClockedIn: false,
    todayTasks: [
      { id: 1, title: 'Complete project documentation', status: 'completed', priority: 'high' },
      { id: 2, title: 'Review code changes', status: 'in-progress', priority: 'medium' },
      { id: 3, title: 'Team meeting at 2 PM', status: 'pending', priority: 'low' },
      { id: 4, title: 'Submit weekly report', status: 'pending', priority: 'high' }
    ],
    attendance: 95,
    leaveBalance: 15,
    performance: 87,
    upcomingEvents: [
      { id: 1, type: 'meeting', title: 'Team Standup', time: '09:30 AM', date: 'Today' },
      { id: 2, type: 'deadline', title: 'Project Deadline', time: '05:00 PM', date: 'Tomorrow' },
      { id: 3, type: 'leave', title: 'Annual Leave', time: 'All Day', date: 'Next Week' }
    ]
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setEmployeeData(prev => ({
        ...prev,
        currentTime: new Date().toLocaleTimeString()
      }))
    }, 1000)

    setTimeout(() => setLoading(false), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClockInOut = () => {
    setEmployeeData(prev => ({
      ...prev,
      isClockedIn: !prev.isClockedIn
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Good Morning, {user?.full_name?.split(' ')[0]}!</h1>
              <p className="text-gray-600">Here's your day at a glance</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">{employeeData.currentTime}</div>
              <div className="text-sm text-gray-500">Current Time</div>
            </div>
          </div>
          {/* Debug Info */}
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm text-indigo-800">
              <strong>Debug Info:</strong> User Role: {user?.role || 'undefined'} | 
              User ID: {user?.id || 'undefined'}
            </p>
          </div>
          {/* Dashboard Indicator */}
          <div className="mt-4 inline-block bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-2 rounded-full shadow-lg">
            <strong className="text-sm font-semibold">EMPLOYEE DASHBOARD</strong>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button 
          onClick={handleClockInOut}
          className={`p-6 rounded-xl shadow-lg transition-all duration-200 transform hover:-translate-y-1 ${
            employeeData.isClockedIn 
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
          } text-white font-semibold flex items-center justify-center space-x-3`}
        >
          {employeeData.isClockedIn ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          <span>{employeeData.isClockedIn ? 'Clock Out' : 'Clock In'}</span>
        </button>

        <button className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 transform hover:-translate-y-1 font-semibold flex items-center justify-center space-x-3">
          <Calendar className="h-6 w-6" />
          <span>Request Leave</span>
        </button>

        <button className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg transition-all duration-200 transform hover:-translate-y-1 font-semibold flex items-center justify-center space-x-3">
          <FileText className="h-6 w-6" />
          <span>View Payslip</span>
        </button>

        <button className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg transition-all duration-200 transform hover:-translate-y-1 font-semibold flex items-center justify-center space-x-3">
          <Coffee className="h-6 w-6" />
          <span>Take Break</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Tasks */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Today's Tasks</h3>
            <div className="space-y-4">
              {employeeData.todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${
                      task.status === 'completed' ? 'bg-emerald-500' : 
                      task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-500 capitalize">{task.status}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My Stats */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">My Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900">Attendance</p>
                    <p className="text-sm text-gray-500">This month</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{employeeData.attendance}%</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Leave Balance</p>
                    <p className="text-sm text-gray-500">Days remaining</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">{employeeData.leaveBalance}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Performance</p>
                    <p className="text-sm text-gray-500">This quarter</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-purple-600">{employeeData.performance}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            <div className="space-y-4">
              {employeeData.upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    event.type === 'meeting' ? 'bg-blue-500' :
                    event.type === 'deadline' ? 'bg-red-500' :
                    'bg-emerald-500'
                  }`}>
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-500">{event.time} • {event.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Info */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Employee Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="text-gray-900">{user?.full_name}</p>
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
                <Briefcase className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Position</p>
                  <p className="text-gray-900 capitalize">{user?.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Work Hours</p>
                  <p className="text-gray-900">{employeeData.clockIn} - {employeeData.clockOut}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-gray-900">Task completed</p>
                <p className="text-sm text-gray-500">Project documentation finished</p>
              </div>
              <span className="text-sm text-gray-400 ml-auto">2 hours ago</span>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Clock in</p>
                <p className="text-sm text-gray-500">Started work at 9:00 AM</p>
              </div>
              <span className="text-sm text-gray-400 ml-auto">4 hours ago</span>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Leave request</p>
                <p className="text-sm text-gray-500">Annual leave approved</p>
              </div>
              <span className="text-sm text-gray-400 ml-auto">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard 