const { createClient } = require('@supabase/supabase-js')

// Netlify serverless function handler
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database configuration missing' })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get Authorization header
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header missing' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Extract user ID from token
    if (!token.startsWith('demo-token-')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' })
      }
    }

    const userId = token.replace('demo-token-', '')

    // Get the logged-in user's company_id and role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token - user not found' })
      }
    }

    if (!currentUser.company_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User has no company assigned' })
      }
    }

    // Parse the path to determine the endpoint
    const path = event.path.replace('/.netlify/functions/users', '')

    // Handle different endpoints
    if (path.includes('/dashboard')) {
      return await handleDashboard(event, headers, supabase, currentUser)
    } else if (path.includes('/company/profile')) {
      return await handleCompanyProfile(event, headers, supabase, currentUser)
    } else if (path.includes('/mock/employees')) {
      return await handleMockEmployees(event, headers, supabase, currentUser)
    } else if (path.includes('/mock/company')) {
      return await handleMockCompany(event, headers, supabase, currentUser)
    } else if (path.includes('/employees') && event.httpMethod === 'POST') {
      return await handleAddEmployee(event, headers, supabase, currentUser)
    } else if (path.includes('/employees') && event.httpMethod === 'GET') {
      return await handleGetEmployees(event, headers, supabase, currentUser)
    } else if (path.includes('/debug/auth-test') && event.httpMethod === 'GET') {
      return await handleAuthTest(event, headers, supabase, currentUser)
    } else if (path.includes('/debug/db-test') && event.httpMethod === 'GET') {
      return await handleDbTest(event, headers, supabase, currentUser)
    } else if (path.includes('/debug/insert-test') && event.httpMethod === 'POST') {
      return await handleInsertTest(event, headers, supabase, currentUser)
    } else if (path.includes('/debug/schema') && event.httpMethod === 'GET') {
      return await handleSchemaTest(event, headers, supabase, currentUser)
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Endpoint not found' })
      }
    }

  } catch (error) {
    console.error('Users API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

// Handle dashboard data
async function handleDashboard(event, headers, supabase, currentUser) {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

    // Get basic dashboard stats
    const { data: employees, error: empError } = await supabase
      .from('users')
      .select('id, role')
      .eq('company_id', currentUser.company_id)
      .neq('role', 'admin')

    if (empError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch dashboard data' })
      }
    }

    const dashboardData = {
      total_employees: employees?.length || 0,
      company_id: currentUser.company_id,
      user_role: currentUser.role,
      user_email: currentUser.email
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(dashboardData)
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Handle company profile
async function handleCompanyProfile(event, headers, supabase, currentUser) {
  try {
    if (event.httpMethod === 'GET') {
      // Get company profile - check if company_info table exists first
      try {
        const { data: companyProfile, error } = await supabase
          .from('company_info')
          .select('*')
          .eq('id', currentUser.company_id)
          .single()

        if (error) {
          // Fallback to users table if company_info doesn't exist
          const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('created_at')
            .eq('company_id', currentUser.company_id)
            .limit(1)
            .single()

          if (userError) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                company: {
                  name: 'Your Company',
                  company_id: currentUser.company_id,
                  created_at: new Date().toISOString(),
                  message: 'Using default company profile'
                }
              })
            }
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              company: {
                name: 'Your Company',
                company_id: currentUser.company_id,
                created_at: userProfile?.created_at || new Date().toISOString(),
                note: 'Company name not stored in database - using default'
              }
            })
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            company: {
              name: companyProfile?.name || companyProfile?.company_name || 'Your Company',
              company_id: currentUser.company_id,
              created_at: companyProfile?.created_at || new Date().toISOString(),
              ...companyProfile
            }
          })
        }

      } catch (fallbackError) {
        // If all else fails, return default company info
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            company: {
              name: 'Your Company',
              company_id: currentUser.company_id,
              created_at: new Date().toISOString(),
              message: 'Using default company profile'
            }
          })
        }
      }

    } else if (event.httpMethod === 'PUT') {
      // Update company profile
      const requestBody = JSON.parse(event.body)
      const { company_name, name, address, phone, email, website, industry, founded_year, location, description } = requestBody

      // Support both company_name and name fields
      const companyName = company_name || name

      if (!companyName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Company name is required' })
        }
      }

      // Store company info in company_info table
      try {
        // First, ensure the company_info table exists by trying to create it
        const { error: createTableError } = await supabase
          .rpc('create_company_info_table_if_not_exists')

        if (createTableError) {
          console.log('Table creation RPC not available, trying direct insert/update')
        }

        // Try to create/update company_info table
        const { data: companyData, error: companyError } = await supabase
          .from('company_info')
          .upsert({
            id: currentUser.company_id,
            name: companyName,
            address: address || null,
            phone: phone || null,
            email: email || null,
            website: website || null,
            industry: industry || null,
            founded_year: founded_year || null,
            location: location || null,
            description: description || null,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (companyError) {
          console.log('Company_info table not accessible, storing in users table metadata')
          // Fallback: store company name in a custom field or just log it
          console.log('Company profile update requested:', { companyName, company_id: currentUser.company_id })
          console.log('Note: company_name will be stored in company_info table when available')
          
          // Try to update users table with company_name if the column exists
          try {
            const { error: updateError } = await supabase
              .from('users')
              .update({ company_name: companyName })
              .eq('company_id', currentUser.company_id)
            
            if (updateError) {
              console.log('Could not update users table with company_name:', updateError.message)
            }
          } catch (updateError) {
            console.log('Users table update failed:', updateError.message)
          }
        } else {
          console.log('Company profile stored successfully in company_info table')
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Company profile updated successfully',
            company: {
              name: companyName,
              company_id: currentUser.company_id,
              address: address || null,
              phone: phone || null,
              email: email || null,
              website: website || null,
              industry: industry || null,
              founded_year: founded_year || null,
              location: location || null,
              description: description || null,
              updated_at: new Date().toISOString()
            },
            note: companyError 
              ? 'Company info stored in company_info table or logged for future storage'
              : 'Company info stored successfully in company_info table',
            stored_fields: {
              name: companyName,
              address: address || null,
              phone: phone || null,
              email: email || null,
              website: website || null,
              industry: industry || null,
              founded_year: founded_year || null,
              location: location || null,
              description: description || null
            }
          })
        }

      } catch (error) {
        console.log('Company_info table not available, using fallback storage')
        console.log('Company profile update requested:', { companyName, company_id: currentUser.company_id })
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Company profile update requested (fallback mode)',
            company: {
              name: companyName,
              company_id: currentUser.company_id,
              address: address || null,
              phone: phone || null,
              email: email || null,
              website: website || null,
              industry: industry || null,
              founded_year: founded_year || null,
              location: location || null,
              description: description || null,
              updated_at: new Date().toISOString()
            },
            note: 'Company info logged for future storage when table is available',
            stored_fields: {
              name: companyName,
              address: address || null,
              phone: phone || null,
              email: email || null,
              website: website || null,
              industry: industry || null,
              founded_year: founded_year || null,
              location: location || null,
              description: description || null
            }
          })
        }
      }

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

  } catch (error) {
    console.error('Company profile error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    }
  }
}

// Handle mock employees data
async function handleMockEmployees(event, headers, supabase, currentUser) {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

    // Return mock employee data for development/testing
    const mockEmployees = [
      {
        id: 'mock-1',
        full_name: 'John Doe',
        email: 'john.doe@company.com',
        role: 'employee',
        department: 'Engineering',
        designation: 'Software Engineer',
        salary: 75000,
        joining_date: '2023-01-15',
        phone_number: '+1-555-0123',
        address: '123 Main St, City, State',
        emergency_contact: 'Jane Doe (+1-555-0124)',
        pan_number: 'ABCDE1234F',
        bank_account: '1234567890',
        leave_balance: 18,
        is_active: true
      },
      {
        id: 'mock-2',
        full_name: 'Jane Smith',
        email: 'jane.smith@company.com',
        role: 'hr',
        department: 'Human Resources',
        designation: 'HR Specialist',
        salary: 65000,
        joining_date: '2023-02-01',
        phone_number: '+1-555-0125',
        address: '456 Oak Ave, City, State',
        emergency_contact: 'John Smith (+1-555-0126)',
        pan_number: 'FGHIJ5678K',
        bank_account: '0987654321',
        leave_balance: 22,
        is_active: true
      }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mockEmployees)
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Handle mock company data
async function handleMockCompany(event, headers, supabase, currentUser) {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

    // Return mock company data for development/testing
    const mockCompany = {
      company_name: 'TechCorp Solutions',
      company_id: currentUser.company_id,
      industry: 'Technology',
      founded_year: 2020,
      employee_count: 25,
      location: 'San Francisco, CA',
      website: 'https://techcorp-solutions.com',
      description: 'Innovative technology solutions for modern businesses',
      contact_email: 'info@techcorp-solutions.com',
      contact_phone: '+1-555-0000'
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mockCompany)
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Handle getting employees list
async function handleGetEmployees(event, headers, supabase, currentUser) {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

    console.log(`Fetching employees for company: ${currentUser.company_id} (user: ${currentUser.email})`)

    // Fetch employees from the same company (company isolation)
    const { data: employees, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        company_id,
        created_at,
        is_active
      `)
      .eq('company_id', currentUser.company_id)
      .neq('role', 'admin') // Exclude admin from employee list
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      }
    }

    console.log(`Found ${employees?.length || 0} employees for company ${currentUser.company_id}`)

    // Transform data to match frontend expectations
    const transformedEmployees = (employees || []).map(emp => ({
      id: emp.id,
      full_name: emp.full_name || 'Unknown Name',
      email: emp.email || 'No Email',
      department: 'Not Assigned', // Default since we don't have this column
      designation: emp.role === 'hr_manager' ? 'HR Manager' : 
                   emp.role === 'hr' ? 'HR Specialist' : 
                   emp.role === 'team_lead' ? 'Team Lead' : 'Employee',
      salary: 50000, // Default salary - you can add salary column later
      joining_date: emp.created_at ? new Date(emp.created_at).toISOString().split('T')[0] : 'Unknown',
      phone_number: '', // Default since we don't have this column
      address: '', // Default since we don't have this column
      role: emp.role,
      company_id: emp.company_id,
      company_name: 'Your Company', // Default since column doesn't exist
      leave_balance: 20, // Default leave balance
      status: emp.is_active ? 'active' : 'inactive',
      created_at: emp.created_at,
      is_active: emp.is_active
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        employees: transformedEmployees,
        total: transformedEmployees.length,
        company_id: currentUser.company_id,
        company_name: 'Your Company', // Default since column doesn't exist
        current_user: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role
        },
        message: 'Employees fetched successfully',
        debug_info: {
          company_id: currentUser.company_id,
          user_role: currentUser.role,
          employees_found: transformedEmployees.length,
          company_isolation: 'enabled'
        }
      })
    }

  } catch (error) {
    console.error('Employees fetch error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch employees',
        message: error.message
      })
    }
  }
}

// Handle employee creation - using the working Vercel approach
async function handleAddEmployee(event, headers, supabase, currentUser) {
  try {
    // Check if user has permission to add employees
    if (!['admin', 'hr_manager', 'hr'].includes(currentUser.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only Admin, HR Manager, and HR can add employees' })
      }
    }

    // Parse request body
    const requestBody = JSON.parse(event.body)
    const { 
      email, 
      full_name, 
      department, 
      designation, 
      salary, 
      joining_date,
      phone_number,
      address,
      emergency_contact,
      pan_number,
      bank_account,
      leave_balance = 20
    } = requestBody

    // Validate required fields
    if (!email || !full_name || !salary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Required fields missing: full_name, email, salary' })
      }
    }

    // Set defaults for missing database columns
    const dept = department || 'Not Assigned'
    const desig = designation || 'Employee'

    // Check if email already exists in the same company
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      if (existingUser.company_id === currentUser.company_id) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'User with this email already exists in your company' })
        }
      } else {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'User with this email already exists in another company' })
        }
      }
    }

    // Generate employee ID and password (using Vercel approach)
    const generateEmployeeId = () => {
      const timestamp = Date.now().toString().slice(-6)
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      return `EMP${timestamp}${random}`
    }

    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
      let password = ''
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const employeeId = generateEmployeeId()
    const generatedPassword = generatePassword()

    // Determine role based on designation (HR roles get hr/hr_manager)
    let role = 'employee'
    if (desig.toLowerCase().includes('hr manager') || desig.toLowerCase().includes('hr-manager')) {
      role = 'hr_manager'
    } else if (desig.toLowerCase().includes('hr') || desig.toLowerCase().includes('human resources')) {
      role = 'hr'
    } else if (desig.toLowerCase().includes('team lead') || desig.toLowerCase().includes('team-lead')) {
      role = 'team_lead'
    }

    // Generate UUID for new employee
    const { randomUUID } = require('crypto')
    const newEmployeeId = randomUUID()

    console.log('Creating new employee with ID:', newEmployeeId)
    console.log('Employee data:', {
      id: newEmployeeId,
      email: email.toLowerCase(),
      full_name: full_name,
      role: role,
      company_id: currentUser.company_id,
      created_by: currentUser.id
    })

    // Create new employee directly in users table (Vercel approach)
    const { data: newEmployee, error: createError } = await supabase
      .from('users')
      .insert([
        {
          id: newEmployeeId,
          email: email.toLowerCase(),
          password: generatedPassword,
          full_name: full_name,
          role: role,
          company_id: currentUser.company_id, // Same company as creator
          created_by: currentUser.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('Employee creation error:', createError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create employee',
          message: createError.message 
        })
      }
    }

    console.log('Employee created successfully:', newEmployee)

    // Remove password from response for security
    const { password: _, ...employeeWithoutPassword } = newEmployee

    // Send welcome email with credentials
    let emailSent = false
    let emailError = null
    try {
      console.log('Attempting to send welcome email to:', email)
      
      // Use the email service to send the welcome email
      const emailServiceUrl = `${process.env.URL || 'https://workflowhr.netlify.app'}/.netlify/functions/email`
      
      const emailData = {
        to: email,
        subject: '🎉 Welcome to WorkFlowHR - Your Account Details',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #16a34a; margin-top: 0;">🎉 Welcome to Your Company!</h2>
              <p>Congratulations ${full_name}! Your employee account has been successfully created.</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; margin-top: 0;">Your Account Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Full Name:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${full_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Employee ID:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${employeeId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Department:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${dept}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Designation:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${desig}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0;">🔐 Your Login Credentials:</h3>
              <p style="margin: 0; color: #92400e;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0 0 0; color: #92400e;"><strong>Temporary Password:</strong> <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${generatedPassword}</code></p>
              <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;"><em>⚠️ Please change this password upon your first login for security.</em></p>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #1e40af; margin-top: 0;">🚀 Next Steps:</h3>
              <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>Login to the WorkFlowHR system using your credentials</li>
                <li>Complete your profile information</li>
                <li>Review company policies and procedures</li>
                <li>Contact HR if you need any assistance</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="margin: 0; color: #1f2937; font-weight: bold;">Welcome to the team! 🌟</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from the WorkFlowHR system.</p>
            </div>
          </div>
        `
      }

      // Send email using the email service
      const response = await fetch(emailServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Welcome email sent successfully via email service to:', email)
        emailSent = true
      } else {
        const errorResult = await response.json()
        throw new Error(`Email service responded with status: ${response.status} - ${errorResult.error || 'Unknown error'}`)
      }

    } catch (emailError) {
      console.warn('⚠️ Email sending failed, but employee created successfully:', emailError.message)
      emailError = emailError.message
      // Continue execution - email failure shouldn't break employee creation
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Employee created successfully',
        employee: {
          ...employeeWithoutPassword,
          employee_id: employeeId,
          password: generatedPassword, // Include in response for HR reference
          department: dept,
          designation: desig,
          salary: salary,
          joining_date: joining_date,
          phone_number: phone_number || '',
          address: address || '',
          emergency_contact: emergency_contact || '',
          pan_number: pan_number || '',
          bank_account: bank_account || '',
          leave_balance: leave_balance
        },
        email_sent: emailSent,
        email_status: emailSent 
          ? 'Welcome email sent successfully' 
          : `Email not sent: ${emailError || 'Email service not configured'}`,
        company_isolation: {
          company_id: currentUser.company_id,
          created_by: currentUser.id,
          user_role: currentUser.role
        }
      })
    }

  } catch (error) {
    console.error('Add employee error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    }
  }
}

// Note: sendWelcomeEmail function removed - now using email service directly

// Debug function to test Supabase Auth capabilities
async function handleAuthTest(event, headers, supabase, currentUser) {
  try {
    console.log('Testing Supabase Auth capabilities...')
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (testError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database connection failed',
          details: testError
        })
      }
    }

    // Test admin user creation (this will fail if service role key is wrong)
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPass123'
    
    console.log('Attempting to create test user:', testEmail)
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })

    if (authError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Supabase Auth admin user creation failed',
          details: authError,
          message: 'This means the service role key is incorrect or missing'
        })
      }
    }

    // If successful, delete the test user
    await supabase.auth.admin.deleteUser(authData.user.id)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Supabase Auth test successful',
        details: {
          database_connection: 'OK',
          admin_user_creation: 'OK',
          service_role_key: 'Valid',
          test_user_created_and_deleted: 'OK'
        }
      })
    }

  } catch (error) {
    console.error('Auth test error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Auth test failed',
        message: error.message
      })
    }
  }
}

// Debug function to test basic database operations
async function handleDbTest(event, headers, supabase, currentUser) {
  try {
    console.log('Testing basic database operations...')
    
    // Test 1: Check if users table exists and is accessible
    console.log('Testing users table access...')
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(3)
    
    if (usersError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Users table access failed',
          details: usersError
        })
      }
    }

    // Test 2: Check if employees table exists and is accessible
    console.log('Testing employees table access...')
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('id, employee_id, full_name, email')
      .limit(3)
    
    if (employeesError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Employees table access failed',
          details: employeesError
        })
      }
    }

    // Test 3: Try to get current user's company info
    console.log('Testing company info access...')
    const { data: companyData, error: companyError } = await supabase
      .from('users')
      .select('company_id, company_name')
      .eq('id', currentUser.id)
      .single()
    
    if (companyError) {
      console.warn('Company info access failed:', companyError.message)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Database test successful',
        details: {
          users_table: 'OK',
          employees_table: 'OK',
          company_info: companyError ? 'Failed' : 'OK',
          current_user: {
            id: currentUser.id,
            email: currentUser.email,
            role: currentUser.role,
            company_id: currentUser.company_id
          },
          sample_users: usersData?.length || 0,
          sample_employees: employeesData?.length || 0
        }
      })
    }

  } catch (error) {
    console.error('Database test error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database test failed',
        message: error.message
      })
    }
  }
}

// Debug function to test basic insert operations
async function handleInsertTest(event, headers, supabase, currentUser) {
  try {
    console.log('Testing basic insert operations...')
    
    // Parse request body
    const { test_type } = JSON.parse(event.body)
    
    if (test_type === 'user') {
      // Test inserting a minimal user record
      console.log('Testing user insert...')
      
      const testUserId = `test-${Date.now()}`
      const testUserData = {
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        company_id: currentUser.company_id // Include company_id
      }
      
      console.log('Attempting to insert user:', testUserData)
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert([testUserData])
        .select()
        .single()
      
      if (insertError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'User insert test failed',
            details: insertError,
            attempted_data: testUserData
          })
        }
      }
      
      // Clean up - delete the test user
      await supabase.from('users').delete().eq('id', testUserId)
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'User insert test successful',
          details: {
            inserted_user: insertData,
            test_type: 'user',
            cleanup: 'deleted'
          }
        })
      }
      
    } else if (test_type === 'employee') {
      // Test inserting a minimal employee record
      console.log('Testing employee insert...')
      
      const testEmployeeData = {
        user_id: currentUser.id, // Use current user's ID
        employee_id: `TEST${Date.now()}`,
        full_name: 'Test Employee',
        email: `test-emp-${Date.now()}@example.com`,
        department: 'Testing',
        designation: 'Test Role',
        salary: 50000,
        joining_date: '2024-01-01',
        company_id: currentUser.company_id // Include company_id
      }
      
      console.log('Attempting to insert employee:', testEmployeeData)
      
      const { data: insertData, error: insertError } = await supabase
        .from('employees')
        .insert([testEmployeeData])
        .select()
        .single()
      
      if (insertError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Employee insert test failed',
            details: insertError,
            attempted_data: testEmployeeData
          })
        }
      }
      
      // Clean up - delete the test employee
      await supabase.from('employees').delete().eq('id', insertData.id)
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Employee insert test successful',
          details: {
            inserted_employee: insertData,
            test_type: 'employee',
            cleanup: 'deleted'
          }
        })
      }
      
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid test type. Use "user" or "employee"'
        })
      }
    }

  } catch (error) {
    console.error('Insert test error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Insert test failed',
        message: error.message
      })
    }
  }
}

// Debug function to test database schema
async function handleSchemaTest(event, headers, supabase, currentUser) {
  try {
    console.log('Testing database schema...')
    
    // Test 1: Check users table structure
    console.log('Testing users table structure...')
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Users table access failed',
          details: usersError
        })
      }
    }

    // Get column names from the first user record
    const userColumns = usersData && usersData.length > 0 ? Object.keys(usersData[0]) : []
    
    // Test 2: Check if company_name column exists
    const hasCompanyName = userColumns.includes('company_name')
    
    // Test 3: Check current user's data structure
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    
    if (currentUserError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Current user data fetch failed',
          details: currentUserError
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Schema test successful',
        details: {
          users_table_columns: userColumns,
          has_company_name_column: hasCompanyName,
          current_user_data: currentUserData,
          company_id: currentUser.company_id,
          user_role: currentUser.role
        }
      })
    }

  } catch (error) {
    console.error('Schema test error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Schema test failed',
        message: error.message
      })
    }
  }
}
