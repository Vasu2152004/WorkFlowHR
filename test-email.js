#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * 
 * This script tests the email configuration and sends a test email
 * to verify that the email service is working correctly.
 */

require('dotenv').config()
const emailService = require('./utils/emailService')

async function testEmailConfiguration() {
  console.log('🧪 Testing email configuration...\n')

  // Check if transporter is configured
  if (!emailService.transporter) {
    console.log('❌ Email transporter not configured')
    console.log('Please check your .env file for EMAIL_USER and EMAIL_PASS')
    return
  }

  console.log('✅ Email transporter configured')

  // Test sending a simple email
  console.log('\n📤 Testing email sending...')
  try {
    const testEmail = process.env.EMAIL_USER
    if (!testEmail) {
      console.log('❌ No test email address found in EMAIL_USER')
      return
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: 'Email Configuration Test - WorkFlowHR',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0;">Email Configuration Test</h2>
            <p>This is a test email to verify that the email configuration is working correctly.</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p>This is an automated test from the WorkFlowHR system.</p>
          </div>
        </div>
      `
    }

    const info = await emailService.transporter.sendMail(mailOptions)
    console.log('✅ Test email sent successfully!')
    console.log(`   Message ID: ${info.messageId}`)
  } catch (error) {
    console.log('❌ Failed to send test email:', error.message)
  }

  // Test getting HR emails
  console.log('\n👥 Testing HR email retrieval...')
  try {
    const hrEmails = await emailService.getHREmails()
    if (hrEmails.length > 0) {
      console.log(`✅ Found ${hrEmails.length} HR emails:`)
      hrEmails.forEach(email => console.log(`   - ${email}`))
    } else {
      console.log('⚠️ No HR emails found in database')
    }
  } catch (error) {
    console.log('❌ Failed to retrieve HR emails:', error.message)
  }

  console.log('\n🏁 Email configuration test completed!')
}

// Run the test
testEmailConfiguration().catch(console.error)
