import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { Calendar, User, Clock, FileText, CheckCircle, XCircle, Eye, Filter } from 'lucide-react'

const LeaveManagement = () => {
  const { user } = useAuth()
  const [leaveRequests, setLeaveRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'table'

  useEffect(() => {
    if (user) {
      fetchLeaveRequests()
      fetchEmployees()
      fetchLeaveTypes()
    }
  }, [user, filterStatus, filterEmployee])

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem('access_token')
      let url = 'http://localhost:3000/api/leaves/requests'
      const params = new URLSearchParams()
      
      if (filterStatus) params.append('status', filterStatus)
      if (filterEmployee) params.append('employee_id', filterEmployee)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLeaveRequests(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:3000/api/users/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Handle both array and object response formats
        const employeesArray = Array.isArray(data) ? data : (data.employees || [])
        setEmployees(employeesArray)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const fetchLeaveTypes = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:3000/api/leaves/types', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLeaveTypes(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const handleApprove = async (requestId) => {
    await handleStatusUpdate(requestId, 'approved_by_hr')
  }

  const handleReject = async (requestId) => {
    await handleStatusUpdate(requestId, 'rejected')
  }

  const handleStatusUpdate = async (requestId, status) => {
    if (!remarks.trim() && status === 'rejected') {
      toast.error('Please provide remarks when rejecting a leave request')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`http://localhost:3000/api/leaves/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          hr_remarks: remarks.trim() || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update leave request')
      }

      const data = await response.json()
      toast.success(data.message)
      
      // Reset form
      setSelectedRequest(null)
      setRemarks('')
      
      // Refresh data
      fetchLeaveRequests()
    } catch (error) {
      toast.error(error.message || 'Failed to update leave request')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Pending', icon: Clock },
      approved_by_hr: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Approved', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Rejected', icon: XCircle }
    }
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800 border-gray-200', text: status, icon: Clock }
    const IconComponent = config.icon
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getEmployeeName = (request) => {
    // First try to get from the joined employees data
    if (request.employees && request.employees.full_name) {
      return request.employees.full_name
    }
    
    // Fallback to searching in employees array
    const employee = employees.find(emp => emp.id === request.employee_id)
    return employee ? employee.full_name : 'Unknown Employee'
  }

  const getEmployeeEmail = (request) => {
    // First try to get from the joined employees data
    if (request.employees && request.employees.email) {
      return request.employees.email
    }
    
    // Fallback to searching in employees array
    const employee = employees.find(emp => emp.id === request.employee_id)
    return employee ? employee.email : 'Unknown Email'
  }

  const getLeaveTypeName = (request) => {
    // First try to get from the joined leave_types data
    if (request.leave_types && request.leave_types.name) {
      return request.leave_types.name
    }
    
    // If no joined data, try to find the leave type from the leaveTypes state
    if (leaveTypes.length > 0) {
      const leaveType = leaveTypes.find(type => type.id === request.leave_type_id)
      if (leaveType) {
        return leaveType.name
      }
    }
    
    // Fallback mapping for common leave types
    const fallbackTypes = {
      '550e8400-e29b-41d4-a716-446655440001': 'Annual Leave',
      '550e8400-e29b-41d4-a716-446655440002': 'Sick Leave',
      '550e8400-e29b-41d4-a716-446655440003': 'Personal Leave'
    }
    
    if (fallbackTypes[request.leave_type_id]) {
      return fallbackTypes[request.leave_type_id]
    }
    
    // Final fallback to UUID if no name found
    return request.leave_type_id || 'Unknown Type'
  }

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'border-l-yellow-500',
      approved_by_hr: 'border-l-green-500',
      rejected: 'border-l-red-500'
    }
    return statusColors[status] || 'border-l-gray-500'
  }

  // Calculate statistics
  const getStatistics = () => {
    const total = leaveRequests.length
    const pending = leaveRequests.filter(req => req.status === 'pending').length
    const approved = leaveRequests.filter(req => req.status === 'approved_by_hr').length
    const rejected = leaveRequests.filter(req => req.status === 'rejected').length

    return { total, pending, approved, rejected }
  }

  const statistics = getStatistics()

  if (!user || !['hr', 'hr_manager', 'admin'].includes(user.role)) {
    return <div className="text-center py-8">Access denied. HR role required.</div>
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            {viewMode === 'cards' ? 'Table View' : 'Card View'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.approved}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.rejected}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved_by_hr">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee
            </label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leave Requests Cards */}
      {viewMode === 'cards' && (
        <div>
          {leaveRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leaveRequests.map((request) => (
                <div key={request.id} className={`bg-white rounded-lg shadow-md border-l-4 ${getStatusColor(request.status)} hover:shadow-lg transition-shadow duration-200`}>
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{getEmployeeName(request)}</h3>
                        <p className="text-sm text-gray-500">{getEmployeeEmail(request)}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    {/* Leave Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <FileText className="w-4 h-4 mr-2" />
                        <span className="font-medium">Leave Type:</span>
                        <span className="ml-2">{getLeaveTypeName(request)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium">Dates:</span>
                        <span className="ml-2">{formatDate(request.start_date)} - {formatDate(request.end_date)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Duration:</span>
                        <span className="ml-2">{request.total_days} days</span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Reason:</span>
                        <span className="ml-2">{request.reason}</span>
                      </p>
                    </div>

                    {/* Applied Date */}
                    <div className="text-xs text-gray-400 mb-4">
                      Applied on {formatDate(request.created_at)}
                    </div>

                    {/* Actions */}
                    {request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors duration-200"
                        >
                          {loading ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    {request.status !== 'pending' && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        {request.status === 'approved_by_hr' ? '✅ Request Approved' : '❌ Request Rejected'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Requests</h3>
              <p className="text-gray-500">There are no leave requests to display at the moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Leave Requests Table (Alternative View) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Requests</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getEmployeeName(request)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getEmployeeEmail(request)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getLeaveTypeName(request)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.total_days} days
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={loading}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status !== 'pending' && (
                        <span className="text-gray-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leaveRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No leave requests found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Leave Request
              </h3>
              <div className="mb-4">
                <p><strong>Employee:</strong> {getEmployeeName(selectedRequest)}</p>
                <p><strong>Leave Type:</strong> {getLeaveTypeName(selectedRequest)}</p>
                <p><strong>Dates:</strong> {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}</p>
                <p><strong>Days:</strong> {selectedRequest.total_days} days</p>
                <p><strong>Reason:</strong> {selectedRequest.reason}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (required for rejection)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add remarks..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedRequest(null)
                    setRemarks('')
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveManagement 