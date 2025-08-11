const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

// Netlify serverless function handler for sending emails
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    // Only allow POST method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

    // Parse request body
    const { to, subject, html, text } = JSON.parse(event.body)

    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, and either html or text' })
      }
    }

    console.log('📧 Email request received:', { to, subject, hasHtml: !!html, hasText: !!text })

    let emailSent = false
    let emailError = null

    // Try to send email using Gmail first
    const emailUser = process.env.EMAIL_USER
    const emailPass = process.env.EMAIL_PASS

    console.log('🔧 Email configuration check:', {
      hasEmailUser: !!emailUser,
      hasEmailPass: !!emailPass,
      emailUser: emailUser ? `${emailUser.substring(0, 3)}***@${emailUser.split('@')[1]}` : 'Not set'
    })

    if (emailUser && emailPass) {
      try {
        console.log('📤 Attempting to send email via Gmail...')
        
        // Create Gmail transporter
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass
          }
        })

        const mailOptions = {
          from: emailUser,
          to: to,
          subject: subject,
          html: html || text,
          text: text || html
        }

        console.log('📨 Mail options prepared:', { from: emailUser, to, subject })

        const info = await transporter.sendMail(mailOptions)
        console.log('✅ Email sent successfully via Gmail:', info.messageId)
        emailSent = true

      } catch (gmailError) {
        console.error('❌ Gmail email failed:', gmailError.message)
        emailError = gmailError.message
      }
    } else {
      console.warn('⚠️ Gmail credentials not configured')
      if (!emailUser) console.warn('  - EMAIL_USER environment variable is missing')
      if (!emailPass) console.warn('  - EMAIL_PASS environment variable is missing')
    }

    // If Gmail failed or not configured, try alternative email service
    if (!emailSent) {
      try {
        console.log('📤 Attempting to send email via alternative service...')
        
        // Try using a free email service like Resend or similar
        const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'https://api.resend.com/emails'
        const emailServiceKey = process.env.EMAIL_SERVICE_KEY

        console.log('🔧 Alternative service check:', {
          hasServiceUrl: !!emailServiceUrl,
          hasServiceKey: !!emailServiceKey
        })

        if (emailServiceUrl && emailServiceKey) {
          const response = await fetch(emailServiceUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${emailServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'noreply@workflowhr.com',
              to: to,
              subject: subject,
              html: html || text
            })
          })

          if (response.ok) {
            const result = await response.json()
            console.log('✅ Email sent successfully via email service:', result)
            emailSent = true
          } else {
            throw new Error(`Email service responded with status: ${response.status}`)
          }
        } else {
          console.warn('⚠️ Alternative email service not configured')
          if (!emailServiceUrl) console.warn('  - EMAIL_SERVICE_URL environment variable is missing')
          if (!emailServiceKey) console.warn('  - EMAIL_SERVICE_KEY environment variable is missing')
        }
      } catch (serviceError) {
        console.error('❌ Alternative email service failed:', serviceError.message)
        if (!emailError) emailError = serviceError.message
      }
    }

    // Store email in database for reference
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      try {
        await supabase
          .from('email_logs')
          .insert([{
            to_email: to,
            subject: subject,
            html_content: html || text,
            sent_at: new Date().toISOString(),
            status: emailSent ? 'sent' : 'failed',
            error_message: emailError
          }])
        console.log('💾 Email logged to database')
      } catch (dbError) {
        console.warn('⚠️ Failed to log email to database:', dbError.message)
      }
    } else {
      console.warn('⚠️ Database logging not configured')
    }

    if (emailSent) {
      console.log('🎉 Email sent successfully!')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Email sent successfully',
          email: {
            to,
            subject,
            status: 'sent',
            method: emailUser && emailPass ? 'gmail' : 'email_service'
          }
        })
      }
    } else {
      console.error('💥 All email methods failed!')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to send email',
          message: 'All email services failed',
          details: emailError,
          debug_info: {
            gmail_configured: !!(emailUser && emailPass),
            alternative_service_configured: !!(process.env.EMAIL_SERVICE_URL && process.env.EMAIL_SERVICE_KEY),
            database_logging_configured: !!(supabaseUrl && supabaseKey)
          },
          note: 'Email was logged but not delivered. Please check your email configuration and environment variables.'
        })
      }
    }

  } catch (error) {
    console.error('💥 Email function error:', error)
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
