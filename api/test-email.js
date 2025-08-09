const nodemailer = require('nodemailer')

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    console.log('Testing email configuration...')
    
    // Check environment variables
    const emailUser = process.env.EMAIL_USER
    const emailPass = process.env.EMAIL_PASS
    
    if (!emailUser || !emailPass) {
      return res.status(500).json({
        error: 'Email credentials not configured',
        has_user: !!emailUser,
        has_pass: !!emailPass
      })
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    })

    // Test email content
    const testEmail = req.body?.email || 'test@example.com'
    
    const mailOptions = {
      from: emailUser,
      to: testEmail,
      subject: '🎉 HRMS Email Test - Working!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #16a34a; margin-top: 0;">✅ Email Service Working!</h2>
            <p>This is a test email from your HRMS system to confirm email functionality is working correctly.</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h3 style="color: #1f2937; margin-top: 0;">Test Details:</h3>
            <p><strong>From:</strong> ${emailUser}</p>
            <p><strong>To:</strong> ${testEmail}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Successfully Sent!</span></p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p>This is a test from the WorkFlowHR system.</p>
          </div>
        </div>
      `
    }

    // Send email
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Test email sent successfully:', info.messageId)
    
    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully!',
      messageId: info.messageId,
      from: emailUser,
      to: testEmail,
      timestamp: new Date().toISOString(),
      instructions: 'Check your inbox for the test email!'
    })

  } catch (error) {
    console.error('❌ Email test failed:', error)
    
    return res.status(500).json({
      success: false,
      error: 'Email test failed',
      message: error.message,
      details: {
        code: error.code,
        command: error.command,
        response: error.response
      }
    })
  }
}
