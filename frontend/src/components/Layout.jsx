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
  ChevronRight
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
    { name: 'Document Templates', href: '/create-template', icon: '📄', hrOnly: true },
    { name: 'Generate Documents', href: '/generate-document', icon: '📋', hrOnly: true },
    { name: 'Leave Request', href: '/leave-request', icon: '📅', employeeOnly: true },
    { name: 'Leave Management', href: '/leave-management', icon: '📋', hrOnly: true },
    { name: 'Company Profile', href: '/company-profile', icon: '🏢' },
    { name: 'Profile', href: '/profile', icon: '👤' },
  ]

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-700 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-white">HRMS</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-blue-100 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation
              .filter(item => {
                if (item.hrOnly && user?.role !== 'hr') return false
                if (item.employeeOnly && user?.role !== 'employee') return false
                return true
              })
              .map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="sidebar-item font-bold text-black"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
          </nav>
          <div className="border-t border-blue-700 dark:border-gray-700 px-4 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-black">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs font-semibold text-black capitalize">
                  {user?.role || 'user'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center px-3 py-2 text-black hover:text-black hover:bg-blue-800 font-semibold rounded-lg transition-colors"
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
      }`}>
        <div className="flex flex-col flex-grow sidebar relative">
          <div className="flex items-center justify-between px-6 py-4 border-b border-blue-700 dark:border-gray-700">
            <h2 className={`text-xl font-bold text-white transition-opacity duration-300 ${
              sidebarCollapsed ? 'opacity-0' : 'opacity-100'
            }`}>
              HRMS
            </h2>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg text-white hover:bg-blue-800 transition-colors"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation
              .filter(item => {
                if (item.hrOnly && user?.role !== 'hr') return false
                if (item.employeeOnly && user?.role !== 'employee') return false
                return true
              })
              .map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="sidebar-item font-bold text-black group relative"
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span className={`transition-opacity duration-300 ${
                    sidebarCollapsed ? 'opacity-0' : 'opacity-100'
                  }`}>
                    {item.name}
                  </span>
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              ))}
          </nav>
          <div className="border-t border-blue-700 dark:border-gray-700 px-4 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
              </div>
              <div className={`ml-3 transition-opacity duration-300 ${
                sidebarCollapsed ? 'opacity-0' : 'opacity-100'
              }`}>
                <p className="text-sm font-bold text-black">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs font-semibold text-black capitalize">
                  {user?.role || 'user'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`mt-3 w-full flex items-center px-3 py-2 text-black hover:text-black hover:bg-blue-800 font-semibold rounded-lg transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title={sidebarCollapsed ? 'Logout' : ''}
            >
              <LogOut size={16} className={sidebarCollapsed ? '' : 'mr-2'} />
              <span className={`transition-opacity duration-300 ${
                sidebarCollapsed ? 'opacity-0' : 'opacity-100'
              }`}>
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="header">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Menu size={20} />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex p-2 rounded-md text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700"
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <div className="ml-4 lg:ml-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {navigation.find(item => window.location.pathname === item.href)?.name || 'Dashboard'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Welcome back, {user?.full_name || 'User'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 px-4 py-2 pl-10 text-sm border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              </div>

              {/* Notifications */}
              <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                <Bell size={20} />
              </button>

              {/* User menu */}
              <div className="relative">
                <button className="flex items-center space-x-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Floating toggle button for mobile */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed bottom-6 right-6 lg:hidden z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </div>
  )
}

export default Layout 