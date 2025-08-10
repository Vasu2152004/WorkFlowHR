import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Search, 
  Bell, 
  User, 
  LogOut, 
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Employees', href: '/employees', icon: '👥' },
    { name: 'Add HR Staff', href: '/add-hr-staff', icon: '👨‍💼', adminOnly: true },
    { name: 'Salary Slips', href: '/salary-slips', icon: '💰', hrOnly: true },
    { name: 'Document Templates', href: '/create-template', icon: '📄', hrOnly: true },
    { name: 'Generate Documents', href: '/generate-document', icon: '📋', hrOnly: true },
    { name: 'Leave Request', href: '/leave-request', icon: '📅', employeeOnly: true },
    { name: 'Leave Management', href: '/leave-management', icon: '📋', hrOnly: true },
    { name: 'Company Calendar', href: '/company-calendar', icon: '📅' },
    { name: 'Company Profile', href: '/company-profile', icon: '🏢' },
    { name: 'Profile', href: '/profile', icon: '👤' },
    { name: 'Admin Tools', href: '/admin-tools', icon: '⚙️', adminOnly: true },
  ]

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-gradient-to-b from-slate-800 via-slate-700 to-slate-600 h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">WorkFlowHR</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-300 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation
              .filter(item => {
                if (item.hrOnly && !['hr', 'hr_manager', 'admin'].includes(user?.role)) return false
                if (item.employeeOnly && user?.role !== 'employee') return false
                if (item.adminOnly && user?.role !== 'admin') return false
                return true
              })
              .map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="sidebar-item text-white hover:bg-white/10 rounded-lg px-3 py-2 flex items-center transition-all duration-200"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
          </nav>
          <div className="border-t border-slate-600 px-4 py-4 flex-shrink-0">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user?.full_name || user?.email || 'User'}
                </p>
                <p className="text-xs text-slate-300 capitalize">
                  {user?.role || 'user'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-600 font-medium rounded-lg transition-colors"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      } flex-shrink-0`}>
        <div className="flex flex-col h-full sidebar relative">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600 flex-shrink-0">
            <h2 className={`text-xl font-bold text-white transition-opacity duration-300 ${
              sidebarCollapsed ? 'opacity-0' : 'opacity-100'
            }`}>
              WorkFlowHR
            </h2>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg text-white hover:bg-white/10 transition-colors"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation
              .filter(item => {
                if (item.hrOnly && !['hr', 'hr_manager', 'admin'].includes(user?.role)) return false
                if (item.employeeOnly && user?.role !== 'employee') return false
                if (item.adminOnly && user?.role !== 'admin') return false
                return true
              })
              .map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="sidebar-item text-white hover:bg-white/10 rounded-lg px-3 py-2 flex items-center transition-all duration-200"
                >
                  <span className="text-lg">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="ml-3 font-medium">{item.name}</span>
                  )}
                </Link>
              ))}
          </nav>
          <div className="border-t border-slate-600 px-4 py-4 flex-shrink-0">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
              </div>
              {!sidebarCollapsed && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    {user?.full_name || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-slate-300 capitalize">
                    {user?.role || 'user'}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="mt-3 w-full flex items-center px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-600 font-medium rounded-lg transition-colors"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu size={20} />
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-semibold text-gray-900 dark:text-white">
                WorkFlowHR
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout 