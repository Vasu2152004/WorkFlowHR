import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext()

// Backend API URL
const API_BASE_URL = 'http://localhost:3000/api'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProfile = async () => {
    try {
      console.log('🔄 Fetching user profile...')
      const response = await axios.get(`${API_BASE_URL}/auth/profile`)
      console.log('✅ Profile fetched:', response.data.user)
      setUser(response.data.user)
    } catch (error) {
      console.error('❌ Error fetching profile:', error)
      if (error.response?.status === 401) {
        logout()
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email)
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password })
      const { access_token, refresh_token, user } = response.data
      
      console.log('✅ Login successful, user data:', user)
      
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      setUser(user)
      toast.success('Login successful!')
      return true
    } catch (error) {
      console.error('❌ Login failed:', error)
      toast.error(error.response?.data?.error || 'Login failed')
      return false
    }
  }

  const signup = async (full_name, email, password, company_name) => {
    try {
      const userData = {
        full_name,
        email,
        password,
        company_name
      }
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, userData)
      toast.success('Account created successfully! Please login.')
      return true
    } catch (error) {
      toast.error(error.response?.data?.error || 'Signup failed')
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    toast.success('Logged out successfully')
  }

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    isAuthenticated: !!user,
    API_BASE_URL
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 