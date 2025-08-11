# WorkFlowHR Setup Instructions

## Issues Fixed

This update fixes the following critical issues:

1. **Email not working** - Updated email service to actually send emails
2. **Company profile not creating** - Fixed company profile creation logic
3. **Employees not showing** - Fixed employee fetching and company isolation
4. **Company isolation** - Ensured proper data separation between companies

## Quick Setup Steps

### 1. Database Setup

Run the complete database setup script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database-complete-setup.sql
-- This will create all necessary tables and ensure proper company isolation
```

### 2. Environment Variables

Set up the following environment variables in your Netlify dashboard:

#### Required Variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

#### Email Configuration (Choose one):

**Option A: Gmail SMTP**
- `EMAIL_USER` - Your Gmail address
- `EMAIL_PASS` - Your Gmail app password (not regular password)

**Option B: Email Service (Resend, SendGrid, etc.)**
- `EMAIL_SERVICE_URL` - Email service API endpoint
- `EMAIL_SERVICE_KEY` - Email service API key

### 3. Gmail App Password Setup (if using Gmail)

1. Go to your Google Account settings
2. Enable 2-factor authentication
3. Generate an app password for "Mail"
4. Use this app password in `EMAIL_PASS`

### 4. Test the System

1. **Test Email**: Try creating an employee to see if welcome emails are sent
2. **Test Company Profile**: Try updating company information
3. **Test Employee Management**: Add employees and verify they appear in the employee list
4. **Test Company Isolation**: Ensure users only see data from their own company

## What Was Fixed

### Email Service (`api/email.js`)
- ✅ Now actually sends emails instead of just logging them
- ✅ Supports Gmail SMTP and alternative email services
- ✅ Proper error handling and fallback options
- ✅ Stores email logs in database

### Company Profile (`api/users.js`)
- ✅ Fixed company profile creation and update logic
- ✅ Proper handling of company_info table
- ✅ Fallback mechanisms when tables don't exist
- ✅ Consistent response format

### Employee Management (`api/users.js`)
- ✅ Fixed employee creation with proper company isolation
- ✅ Fixed employee fetching to show all company employees
- ✅ Proper data transformation for frontend compatibility
- ✅ Enhanced error handling and logging

### Database Structure
- ✅ Complete table setup with proper relationships
- ✅ Row Level Security (RLS) for company isolation
- ✅ Proper indexes for performance
- ✅ Email logging and working days configuration

## Troubleshooting

### Email Still Not Working?
1. Check environment variables are set correctly
2. Verify Gmail app password (not regular password)
3. Check Netlify function logs for errors
4. Ensure email service API keys are valid

### Employees Still Not Showing?
1. Run the database setup script
2. Check if users have `company_id` assigned
3. Verify RLS policies are working
4. Check browser console for API errors

### Company Profile Issues?
1. Ensure `company_info` table exists
2. Check user permissions (admin/HR only)
3. Verify company_id is properly set
4. Check API response format

## API Endpoints

### Employee Management
- `POST /api/users/employees` - Create new employee
- `GET /api/users/employees` - Get company employees
- `GET /api/users/mock/employees` - Get mock data (fallback)

### Company Profile
- `GET /api/users/company/profile` - Get company profile
- `PUT /api/users/company/profile` - Update company profile

### Email
- `POST /api/email` - Send email

## Company Isolation

The system now properly isolates data between companies:

- Users can only see data from their own company
- Employees are filtered by company_id
- Company profiles are company-specific
- Email logs are company-specific
- Working days configuration is company-specific

## Support

If you continue to have issues:

1. Check Netlify function logs
2. Verify database table structure
3. Test API endpoints individually
4. Ensure all environment variables are set

## Next Steps

After fixing these issues:

1. Test all functionality thoroughly
2. Set up proper email templates
3. Configure additional company settings
4. Set up backup and monitoring
5. Train users on the new system
