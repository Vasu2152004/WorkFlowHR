import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import Employees from './pages/Employees'
import Profile from './pages/Profile'

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <RoleBasedDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/employees" element={
            <ProtectedRoute>
              <Layout>
                <Employees />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

// Component to render different dashboards based on user role
function RoleBasedDashboard() {
  const { user, loading } = useAuth()
  
  console.log('🔍 RoleBasedDashboard Debug:', {
    user: user,
    role: user?.role,
    isEmployee: user?.role === 'employee',
    loading: loading,
    userId: user?.id,
    userEmail: user?.email,
    roleComparison: user?.role === 'employee' ? 'TRUE - Should show Employee Dashboard' : 'FALSE - Should show HR Dashboard'
  })
  
  // Show loading while user data is being fetched
  if (loading) {
    console.log('⏳ Loading user data...')
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }
  
  // If no user, show error
  if (!user) {
    console.log('❌ No user data found')
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">No user data found</h2>
          <p className="text-gray-600">Please login again</p>
        </div>
      </div>
    )
  }
  
  // Force a hard refresh if role is employee but we're still seeing HR dashboard
  if (user?.role === 'employee') {
    console.log('👤 Rendering Employee Dashboard for user:', user.email)
    console.log('🎯 EmployeeDashboard component should render now')
    return <EmployeeDashboard />
  } else {
    console.log('👔 Rendering HR Dashboard for user:', user.email)
    console.log('🎯 Dashboard component should render now')
    return <Dashboard />
  }
}

export default App 