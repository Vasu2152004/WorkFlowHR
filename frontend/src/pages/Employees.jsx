import { useState, useEffect } from 'react'
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  User,
  Mail,
  Building,
  Briefcase,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
  FileText
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const Employees = () => {
  const [employees, setEmployees] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newEmployee, setNewEmployee] = useState({
    full_name: '',
    email: '',
    role: 'employee',
    department: '',
    designation: '',
    base_salary: '',
    joining_date: '',
    phone_number: '',
    address: '',
    leave_balance: 20,
    emergency_contact: '',
    pan_number: '',
    bank_account: '',
    custom_fields: {}
  })

  useEffect(() => {
    // Load employees from API or localStorage
    const savedEmployees = localStorage.getItem('employees')
    if (savedEmployees) {
      setEmployees(JSON.parse(savedEmployees))
    }
  }, [])

  const handleAddEmployee = async () => {
    if (!newEmployee.full_name || !newEmployee.email) {
      toast.error('Please fill in required fields')
      return
    }

    setLoading(true)
    try {
      const employee = {
        ...newEmployee,
        id: Date.now(),
        created_at: new Date().toISOString()
      }

      const updatedEmployees = [...employees, employee]
      setEmployees(updatedEmployees)
      localStorage.setItem('employees', JSON.stringify(updatedEmployees))
      
      setNewEmployee({
        full_name: '',
        email: '',
        role: 'employee',
        department: '',
        designation: '',
        base_salary: '',
        joining_date: '',
        phone_number: '',
        address: '',
        leave_balance: 20,
        emergency_contact: '',
        pan_number: '',
        bank_account: '',
        custom_fields: {}
      })
      
      setShowAddModal(false)
      toast.success('Employee added successfully!')
    } catch (error) {
      toast.error('Failed to add employee')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEmployee = (id) => {
    const updatedEmployees = employees.filter(emp => emp.id !== id)
    setEmployees(updatedEmployees)
    localStorage.setItem('employees', JSON.stringify(updatedEmployees))
    toast.success('Employee deleted successfully!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">Employees</h1>
          <p className="text-black dark:text-gray-300">Manage your team members</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Employee List */}
      <div className="card">
        <div className="p-6">
          {employees.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                No employees yet
              </h3>
              <p className="text-black dark:text-gray-400 mb-6">
                Start building your team by adding your first employee
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add First Employee
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-professional">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white-50 font-semibold mr-3">
                            {employee.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-black dark:text-white">
                              {employee.full_name}
                            </p>
                            <p className="text-sm text-black dark:text-gray-400">
                              {employee.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-black dark:text-white">{employee.email}</td>
                      <td className="text-black dark:text-white">{employee.phone_number || 'N/A'}</td>
                      <td className="text-black dark:text-white">{employee.department || 'N/A'}</td>
                      <td className="text-black dark:text-white">{employee.designation || 'N/A'}</td>
                      <td>
                        <div className="flex space-x-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <Eye size={16} />
                          </button>
                          <button className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  Add New Employee
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <form className="p-6 space-y-6">
              {/* Required Information */}
              <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-black dark:text-white">Required Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      value={newEmployee.full_name}
                      onChange={(e) => setNewEmployee({...newEmployee, full_name: e.target.value})}
                      className="input-field"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      className="input-field"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Department *</label>
                    <select
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                      className="input-field"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Designation *</label>
                    <input
                      type="text"
                      value={newEmployee.designation}
                      onChange={(e) => setNewEmployee({...newEmployee, designation: e.target.value})}
                      className="input-field"
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Base Salary *</label>
                    <input
                      type="number"
                      value={newEmployee.base_salary}
                      onChange={(e) => setNewEmployee({...newEmployee, base_salary: e.target.value})}
                      className="input-field"
                      placeholder="Enter base salary"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Joining Date *</label>
                    <input
                      type="date"
                      value={newEmployee.joining_date}
                      onChange={(e) => setNewEmployee({...newEmployee, joining_date: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-black dark:text-white">Additional Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      value={newEmployee.phone_number}
                      onChange={(e) => setNewEmployee({...newEmployee, phone_number: e.target.value})}
                      className="input-field"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Leave Balance</label>
                    <input
                      type="number"
                      value={newEmployee.leave_balance}
                      onChange={(e) => setNewEmployee({...newEmployee, leave_balance: parseInt(e.target.value) || 0})}
                      className="input-field"
                      placeholder="20"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="form-label">Address</label>
                    <textarea
                      value={newEmployee.address}
                      onChange={(e) => setNewEmployee({...newEmployee, address: e.target.value})}
                      className="input-field"
                      rows="3"
                      placeholder="Enter address"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Emergency Contact</label>
                    <input
                      type="text"
                      value={newEmployee.emergency_contact}
                      onChange={(e) => setNewEmployee({...newEmployee, emergency_contact: e.target.value})}
                      className="input-field"
                      placeholder="Emergency contact details"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">PAN Number</label>
                    <input
                      type="text"
                      value={newEmployee.pan_number}
                      onChange={(e) => setNewEmployee({...newEmployee, pan_number: e.target.value})}
                      className="input-field"
                      placeholder="PAN number"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Bank Account</label>
                    <input
                      type="text"
                      value={newEmployee.bank_account}
                      onChange={(e) => setNewEmployee({...newEmployee, bank_account: e.target.value})}
                      className="input-field"
                      placeholder="Bank account details"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="loading-spinner h-5 w-5 mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    'Add Employee'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees 