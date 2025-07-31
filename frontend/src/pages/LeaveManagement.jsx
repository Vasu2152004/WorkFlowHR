import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Filter,
  Search,
  Eye,
  MessageSquare
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const LeaveManagement = () => {
  const { user } = useAuth()
  const [leaveRequests, setLeaveRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [hrRemarks, setHrRemarks] = useState('')

  useEffect(() => {
    fetchLeaveRequests()
    fetchEmployees()
  }, [selectedEmployee, selectedStatus])

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem('access_token')
      let url = 'http://localhost:3000/api/leaves/requests'
      
      const params = new URLSearchParams()
      if (selectedEmployee) params.append('employee_id', selectedEmployee)
      if (selectedStatus) params.append('status', selectedStatus)
      
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
        setLeaveRequests(data.leaveRequests)
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error)
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
        setEmployees(data.employees)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleApproveReject = async (requestId, status) => {
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
          hr_remarks: hrRemarks
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update leave request')
      }

      const data = await response.json()
      toast.success(`Leave request ${status} successfully!`)
      
      // Close modal and refresh data
      setShowModal(false)
      setSelectedRequest(null)
      setHrRemarks('')
      fetchLeaveRequests()
    } catch (error) {
      console.error('Error updating leave request:', error)
      toast.error(error.message || 'Failed to update leave request')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (request) => {
    setSelectedRequest(request)
    setShowModal(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} />
      case 'rejected': return <XCircle size={16} />
      case 'pending': return <Clock size={16} />
      default: return <AlertCircle size={16} />
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredRequests = leaveRequests.filter(request => {
    const employeeName = request.employees?.full_name?.toLowerCase() || ''
    const reason = request.reason?.toLowerCase() || ''
    const searchLower = searchTerm.toLowerCase()
    
    return employeeName.includes(searchLower) || reason.includes(searchLower)
  })

  if (!user || user.role !== 'hr') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only HR users can access leave management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Review and manage employee leave requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {leaveRequests.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {leaveRequests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {leaveRequests.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="input-field"
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All Status</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchLeaveRequests}
              className="btn-primary w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Leave Requests */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leave Requests</h2>
        
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {request.employees?.full_name?.charAt(0) || 'E'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {request.employees?.full_name || 'Unknown Employee'}
                    </h3>
                    <p className="text-sm text-gray-500">{request.employees?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    <span className="capitalize">{request.status}</span>
                  </span>
                  
                  {request.status === 'pending' && (
                    <button
                      onClick={() => openModal(request)}
                      className="btn-secondary text-sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Leave Type:</span>
                  <div className="font-medium">
                    {request.leave_types.name}
                    {!request.leave_types.is_paid && ' (Unpaid)'}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Period:</span>
                  <div className="font-medium">
                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Days:</span>
                  <div className="font-medium">{request.total_days} days</div>
                </div>
                
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Requested:</span>
                  <div className="font-medium">{formatDate(request.requested_at)}</div>
                </div>
              </div>
              
              <div className="mt-3">
                <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                <div className="font-medium mt-1">{request.reason}</div>
              </div>
              
              {request.hr_remarks && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">HR Remarks:</span>
                  <div className="font-medium mt-1">{request.hr_remarks}</div>
                </div>
              )}
            </div>
          ))}
          
          {filteredRequests.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leave requests found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Approve/Reject */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Review Leave Request
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Employee:</span>
                <div className="font-medium">{selectedRequest.employees?.full_name}</div>
              </div>
              
              <div>
                <span className="text-gray-600 dark:text-gray-400">Leave Type:</span>
                <div className="font-medium">
                  {selectedRequest.leave_types.name}
                  {!selectedRequest.leave_types.is_paid && ' (Unpaid)'}
                </div>
              </div>
              
              <div>
                <span className="text-gray-600 dark:text-gray-400">Period:</span>
                <div className="font-medium">
                  {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                </div>
              </div>
              
              <div>
                <span className="text-gray-600 dark:text-gray-400">Days:</span>
                <div className="font-medium">{selectedRequest.total_days} days</div>
              </div>
              
              <div>
                <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                <div className="font-medium mt-1">{selectedRequest.reason}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  HR Remarks (Optional)
                </label>
                <textarea
                  value={hrRemarks}
                  onChange={(e) => setHrRemarks(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Add any remarks for the employee..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleApproveReject(selectedRequest.id, 'rejected')}
                disabled={loading}
                className="btn-danger flex-1"
              >
                {loading ? 'Processing...' : 'Reject'}
              </button>
              
              <button
                onClick={() => handleApproveReject(selectedRequest.id, 'approved')}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveManagement 