import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Building,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Edit,
  Save,
  X,
  Eye,
  Target,
  Lightbulb,
  Heart,
  ExternalLink,
  Plus
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const CompanyProfile = () => {
  const { user } = useAuth()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    industry: '',
    founded_year: '',
    website: '',
    phone: '',
    address: '',
    email: '',
    mission: '',
    vision: '',
    values: ''
  })

  // Fetch company profile
  const fetchCompanyProfile = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      const response = await fetch('http://localhost:3000/api/users/company/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.')
          return
        }
        throw new Error('Failed to fetch company profile')
      }

      const data = await response.json()
      setCompany(data.company)
      setEditForm({
        name: data.company.name || '',
        description: data.company.description || '',
        industry: data.company.industry || '',
        founded_year: data.company.founded_year || '',
        website: data.company.website || '',
        phone: data.company.phone || '',
        address: data.company.address || '',
        email: data.company.email || '',
        mission: data.company.mission || '',
        vision: data.company.vision || '',
        values: data.company.values || ''
      })
    } catch (error) {
      console.error('Error fetching company profile:', error)
      toast.error('Failed to fetch company profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanyProfile()
  }, [])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original values
    setEditForm({
      name: company.name || '',
      description: company.description || '',
      industry: company.industry || '',
      founded_year: company.founded_year || '',
      website: company.website || '',
      phone: company.phone || '',
      address: company.address || '',
      email: company.email || '',
      mission: company.mission || '',
      vision: company.vision || '',
      values: company.values || ''
    })
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:3000/api/users/company/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.')
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update company profile')
      }

      const data = await response.json()
      setCompany(data.company)
      setIsEditing(false)
      toast.success('Company profile updated successfully!')
    } catch (error) {
      console.error('Error updating company profile:', error)
      toast.error(error.message || 'Failed to update company profile')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Company Profile Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {user?.role === 'hr' 
            ? 'No company profile has been created yet. Create one to get started.'
            : 'Company profile has not been set up yet.'
          }
        </p>
        {user?.role === 'hr' && (
          <button
            onClick={() => {
              setCompany({
                name: '',
                description: '',
                industry: '',
                founded_year: '',
                website: '',
                phone: '',
                address: '',
                email: '',
                mission: '',
                vision: '',
                values: ''
              })
              setEditForm({
                name: '',
                description: '',
                industry: '',
                founded_year: '',
                website: '',
                phone: '',
                address: '',
                email: '',
                mission: '',
                vision: '',
                values: ''
              })
              setIsEditing(true)
            }}
            className="btn-primary flex items-center mx-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Company Profile
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Profile</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {user?.role === 'hr' ? 'Manage your company information' : 'Learn about your company'}
          </p>
        </div>
        {user?.role === 'hr' && (
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="btn-secondary flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="btn-primary flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        )}
      </div>

      {/* Company Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Basic Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Company Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleInputChange}
                  className="input-field mt-1"
                  placeholder="Enter company name"
                />
              ) : (
                <p className="text-gray-900 dark:text-white font-medium">{company.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
              {isEditing ? (
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="input-field mt-1"
                  placeholder="Enter company description"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {company.description || 'No description available'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Industry</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="industry"
                    value={editForm.industry}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                    placeholder="Enter industry"
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    {company.industry || 'Not specified'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Founded Year</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="founded_year"
                    value={editForm.founded_year}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                    placeholder="Enter founded year"
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    {company.founded_year || 'Not specified'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Contact Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleInputChange}
                  className="input-field mt-1"
                  placeholder="Enter company email"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {company.email || 'Not specified'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleInputChange}
                  className="input-field mt-1"
                  placeholder="Enter company phone"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {company.phone || 'Not specified'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
              {isEditing ? (
                <input
                  type="url"
                  name="website"
                  value={editForm.website}
                  onChange={handleInputChange}
                  className="input-field mt-1"
                  placeholder="Enter website URL"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {company.website ? (
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                    >
                      {company.website}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  ) : (
                    'Not specified'
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
              {isEditing ? (
                <textarea
                  name="address"
                  value={editForm.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="input-field mt-1"
                  placeholder="Enter company address"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {company.address || 'Not specified'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Company Values */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mission */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Mission
          </h3>
          {isEditing ? (
            <textarea
              name="mission"
              value={editForm.mission}
              onChange={handleInputChange}
              rows="4"
              className="input-field"
              placeholder="Enter company mission"
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              {company.mission || 'No mission statement available'}
            </p>
          )}
        </div>

        {/* Vision */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Vision
          </h3>
          {isEditing ? (
            <textarea
              name="vision"
              value={editForm.vision}
              onChange={handleInputChange}
              rows="4"
              className="input-field"
              placeholder="Enter company vision"
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              {company.vision || 'No vision statement available'}
            </p>
          )}
        </div>

        {/* Values */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Heart className="h-5 w-5 mr-2" />
            Values
          </h3>
          {isEditing ? (
            <textarea
              name="values"
              value={editForm.values}
              onChange={handleInputChange}
              rows="4"
              className="input-field"
              placeholder="Enter company values"
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              {company.values || 'No values statement available'}
            </p>
          )}
        </div>
      </div>

      {/* Company Statistics */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Company Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {company.founded_year ? new Date().getFullYear() - company.founded_year : 'N/A'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Years in Business</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {company.industry || 'N/A'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Industry</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {company.updated_at ? new Date(company.updated_at).toLocaleDateString() : 'N/A'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyProfile 