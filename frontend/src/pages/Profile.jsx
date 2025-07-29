import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Building, Calendar, Shield } from 'lucide-react'

const Profile = () => {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: Implement profile update
    setIsEditing(false)
  }

  const profileInfo = [
    {
      label: 'Full Name',
      value: user?.full_name,
      icon: User
    },
    {
      label: 'Email',
      value: user?.email,
      icon: Mail
    },
    {
      label: 'Company',
      value: user?.company_name || 'Your Company',
      icon: Building
    },
    {
      label: 'Role',
      value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1),
      icon: Shield
    },
    {
      label: 'Member Since',
      value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      icon: Calendar
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary-800">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.full_name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <span className="mt-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-primary-100 text-primary-800">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-secondary"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {profileInfo.map((info, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-shrink-0">
                      <info.icon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-700">{info.label}</p>
                      <p className="text-sm text-gray-900">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Change Password</p>
              <p className="text-sm text-gray-500">Update your account password</p>
            </div>
            <button className="btn-secondary">Change</button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security</p>
            </div>
            <button className="btn-secondary">Enable</button>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Export Data</p>
              <p className="text-sm text-gray-500">Download your account data</p>
            </div>
            <button className="btn-secondary">Export</button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Delete Account</p>
              <p className="text-sm text-gray-500">Permanently delete your account</p>
            </div>
            <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile 