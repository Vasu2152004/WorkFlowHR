const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')

// Debug endpoint to check user role and permissions
router.get('/user-info', authenticateToken, (req, res) => {
  try {
    const user = req.user
    const isAdmin = user.role === 'admin'
    const isHRManager = user.role === 'hr_manager'
    const isHR = user.role === 'hr'
    const isEmployee = user.role === 'employee'

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company_id: user.company_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      permissions: {
        isAdmin,
        isHRManager,
        isHR,
        isEmployee,
        canManageTemplates: isAdmin || isHRManager || isHR,
        canManageDocuments: isAdmin || isHRManager || isHR,
        canManageLeaves: isAdmin || isHRManager || isHR,
        canManageSalary: isAdmin || isHRManager || isHR,
        canManageHRStaff: isAdmin || isHRManager,
        canCreateHRManager: isAdmin
      },
      roleCheck: {
        exactMatch: {
          admin: user.role === 'admin',
          hr_manager: user.role === 'hr_manager',
          hr: user.role === 'hr',
          employee: user.role === 'employee'
        },
        caseInsensitive: {
          admin: user.role.toLowerCase() === 'admin',
          hr_manager: user.role.toLowerCase() === 'hr_manager',
          hr: user.role.toLowerCase() === 'hr',
          employee: user.role.toLowerCase() === 'employee'
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

module.exports = router
