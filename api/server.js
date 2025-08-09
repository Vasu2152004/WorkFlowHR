const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()

// Basic middleware
app.use(cors({
  origin: ['https://work-flow-gnvfa838h-vasus-projects-33d70e7c.vercel.app', 'http://localhost:3001'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint (always available)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: '1.0.0'
  })
})

// Test endpoint for debugging
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
    }
  })
})

// Try to import and use routes with error handling
try {
  // Import routes with error handling
  const authRoutes = require('../routes/auth')
  const userRoutes = require('../routes/users')
  const documentRoutes = require('../routes/documents')
  const leaveRoutes = require('../routes/leaves')
  const teamLeadRoutes = require('../routes/teamLead')
  const hrManagerRoutes = require('../routes/hrManager')
  const salaryRoutes = require('../routes/salary')
  const workingDaysRoutes = require('../routes/workingDays')
  const companyCalendarRoutes = require('../routes/companyCalendar')

  // API routes
  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/documents', documentRoutes)
  app.use('/api/leaves', leaveRoutes)
  app.use('/api/team-lead', teamLeadRoutes)
  app.use('/api/hr-manager', hrManagerRoutes)
  app.use('/api/salary', salaryRoutes)
  app.use('/api/working-days', workingDaysRoutes)
  app.use('/api/company-calendar', companyCalendarRoutes)

  console.log('✅ All routes loaded successfully')
} catch (error) {
  console.error('❌ Error loading routes:', error.message)
  
  // Fallback route for when routes fail to load
  app.use('/api/*', (req, res) => {
    res.status(500).json({ 
      error: 'Routes not available',
      message: 'Some routes failed to load. Please check environment variables and configuration.',
      availableEndpoints: ['/health', '/test']
    })
  })
}

// Optional email routes
try {
  const emailRoutes = require('../routes/email')
  app.use('/api/email', emailRoutes)
  console.log('✅ Email routes loaded successfully')
} catch (error) {
  console.log('⚠️ Email routes not available:', error.message)
}

// Serve static files from the React app (if available)
try {
  const frontendPath = path.join(__dirname, 'frontend', 'dist')
  if (require('fs').existsSync(frontendPath)) {
    app.use(express.static(frontendPath))
    
    // Catch all handler: send back React's index.html file for any non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'))
    })
    console.log('✅ Frontend static files served')
  } else {
    // If no frontend build, just return API info
    app.get('/', (req, res) => {
      res.json({
        message: 'WorkFlowHR API Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          test: '/test',
          auth: '/api/auth',
          users: '/api/users',
          leaves: '/api/leaves',
          documents: '/api/documents',
          salary: '/api/salary'
        }
      })
    })
    console.log('✅ API-only mode - no frontend build found')
  }
} catch (error) {
  console.error('❌ Error serving static files:', error.message)
  
  // Fallback for static file serving
  app.get('/', (req, res) => {
    res.json({
      message: 'WorkFlowHR API Server',
      version: '1.0.0',
      status: 'running (fallback mode)',
      error: 'Static file serving failed',
      endpoints: {
        health: '/health',
        test: '/test'
      }
    })
  })
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  
  const statusCode = error.statusCode || 500
  const message = NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message || 'Something went wrong'
  
  res.status(statusCode).json({ 
    error: message,
    ...(NODE_ENV === 'development' && { stack: error.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 WorkFlowHR server running on port ${PORT} in ${NODE_ENV} mode`)
    console.log(`📊 Health check available at: http://localhost:${PORT}/health`)
    console.log(`🔗 API base URL: http://localhost:${PORT}/api`)
  })
}

module.exports = app 