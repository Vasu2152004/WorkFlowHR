import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import Employees from './pages/Employees'
import AddEmployee from './pages/AddEmployee'
import AddHRStaff from './pages/AddHRStaff'
import Profile from './pages/Profile'
import CompanyProfile from './pages/CompanyProfile'
import LeaveManagement from './pages/LeaveManagement'
import LeaveRequest from './pages/LeaveRequest'
import SalarySlips from './pages/SalarySlips'
import EmployeeFixedDeductions from './pages/EmployeeFixedDeductions'
import CreateTemplate from './pages/CreateTemplate'
import GenerateDocument from './pages/GenerateDocument'
import CompanyCalendar from './pages/CompanyCalendar'

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#059669',
                secondary: '#ffffff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#dc2626',
                secondary: '#ffffff',
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
          
          <Route path="/add-employee" element={
            <ProtectedRoute>
              <Layout>
                <AddEmployee />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/add-hr-staff" element={
            <ProtectedRoute>
              <Layout>
                <AddHRStaff />
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
          
          <Route path="/company-profile" element={
            <ProtectedRoute>
              <Layout>
                <CompanyProfile />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/create-template" element={
            <ProtectedRoute>
              <Layout>
                <CreateTemplate />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/generate-document" element={
            <ProtectedRoute>
              <Layout>
                <GenerateDocument />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/leave-request" element={
            <ProtectedRoute>
              <Layout>
                <LeaveRequest />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/leave-management" element={
            <ProtectedRoute>
              <Layout>
                <LeaveManagement />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/salary-slips" element={
            <ProtectedRoute>
              <Layout>
                <SalarySlips />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/employee/:employee_id/fixed-deductions" element={
            <ProtectedRoute>
              <Layout>
                <EmployeeFixedDeductions />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/company-calendar" element={
            <ProtectedRoute>
              <Layout>
                <CompanyCalendar />
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
  
  // Show loading while user data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }
  
  // If no user, show error
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-bold text-ruby-600">No user data found</h2>
          <p className="text-gray-600">Please login again</p>
        </div>
      </div>
    )
  }
  
  // Render appropriate dashboard based on user role
  if (user?.role === 'employee') {
    return <EmployeeDashboard />
  } else if (['hr', 'hr_manager', 'admin'].includes(user?.role)) {
    return <Dashboard />
  } else {
    // Default to employee dashboard for unknown roles
    return <EmployeeDashboard />
  }
}

export default App 