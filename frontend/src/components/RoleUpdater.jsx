import React, { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const RoleUpdater = () => {
  const [newRole, setNewRole] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, setUser, API_BASE_URL } = useAuth()

  const handleRoleUpdate = async () => {
    if (!newRole) {
      toast.error('Please select a new role')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.put(`${API_BASE_URL}/update-role`, 
        { new_role: newRole },
        { 
          headers: { 
            'Authorization': `Bearer ${token}` 
          } 
        }
      )

      if (response.data.success) {
        toast.success(response.data.message)
        // Update the user context with new role
        setUser(prevUser => ({
          ...prevUser,
          role: newRole
        }))
        setNewRole('')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Update Your Role</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Current Role: <span className="font-medium">{user.role}</span></p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          New Role
        </label>
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a role</option>
          <option value="employee">Employee</option>
          <option value="team_lead">Team Lead</option>
          <option value="hr">HR Staff</option>
          <option value="hr_manager">HR Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        onClick={handleRoleUpdate}
        disabled={loading || !newRole}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Updating...' : 'Update Role'}
      </button>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Note:</strong> This is for development/testing purposes only.</p>
        <p>HR roles can create templates and generate documents.</p>
      </div>
    </div>
  )
}

export default RoleUpdater
