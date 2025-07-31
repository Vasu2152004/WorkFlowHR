const express = require('express')
const router = express.Router()

// Optional email functionality - only load if nodemailer is available
let transporter = null
try {
  const nodemailer = require('nodemailer')
  
  // Email configuration
  transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to your email service
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  })
} catch (error) {
  console.log('⚠️ Nodemailer not available - email functionality disabled')
}

// Send welcome email to new employee
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: to, subject, html' 
      })
    }

    if (!transporter) {
      return res.status(503).json({ 
        success: false, 
        message: 'Email service not configured' 
      })
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: to,
      subject: subject,
      html: html
    }

    const info = await transporter.sendMail(mailOptions)
    
    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    })

  } catch (error) {
    console.error('Email sending error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    })
  }
})

module.exports = router 