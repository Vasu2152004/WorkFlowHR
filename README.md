# HRMS (Human Resource Management System)

A comprehensive Human Resource Management System built with Node.js, Express.js, React.js, and Supabase. This system provides complete HR functionality with multi-tenant architecture, role-based access control, and automated email notifications.

## 🚀 Features

### Core HR Features
- **Employee Management**: Add, view, and manage employee profiles
- **Leave Management**: Request, approve, and track leave with automatic balance deduction
- **Salary Management**: Generate salary slips with automatic deductions for unpaid leaves
- **Document Management**: Create and manage HR documents with rich text editor
- **Company Isolation**: Multi-tenant architecture ensuring data security

### User Roles & Access Control
- **Admin**: Full system access, company management
- **HR Manager**: Employee management, leave approvals, salary generation
- **HR Specialist**: Basic HR operations
- **Employee**: Self-service portal for leave requests and salary slips

### Advanced Features
- **Email Notifications**: Automated emails for leave requests, approvals, and salary slips
- **Leave Balance Tracking**: Automatic deduction of leave balance for approved paid leaves
- **Salary Deductions**: Automatic calculation of unpaid leave deductions
- **Responsive UI**: Modern card-based interface with dark/light theme support

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database and authentication
- **JWT** - Authentication tokens
- **Nodemailer** - Email notifications

### Frontend
- **React.js** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

### Database
- **PostgreSQL** (via Supabase)
- **Row Level Security (RLS)** - Data isolation
- **Real-time subscriptions**

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Gmail account (for email notifications)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HRMS
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp env.example .env
   ```

4. **Configure Environment Variables**
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # JWT Configuration
   JWT_SECRET=your_jwt_secret

   # Email Configuration (Gmail)
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_gmail_app_password
   ```

5. **Database Setup**
   - Create a Supabase project
   - Run the SQL scripts in the `database/` folder
   - Configure Row Level Security policies

6. **Start the application**
   ```bash
   # Start backend server
   npm start

   # Start frontend (in another terminal)
   cd frontend
   npm run dev
   ```

## 📁 Project Structure

```
HRMS/
├── config/                 # Supabase configuration
├── controllers/            # API controllers
├── database/              # SQL scripts and migrations
├── frontend/              # React frontend application
├── middleware/            # Authentication middleware
├── routes/               # API routes
├── utils/                # Utility functions
├── server.js             # Main server file
└── package.json          # Backend dependencies
```

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Get your project URL and API keys
3. Run the database migration scripts
4. Configure RLS policies for data isolation

### Email Configuration
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password
3. Add the credentials to your `.env` file

## 🎯 Key Features Explained

### Multi-Tenant Architecture
- Each company has isolated data
- Users can only access their company's information
- Automatic company assignment on signup

### Leave Management
- **Leave Types**: Annual, Sick, Personal, and custom types
- **Balance Tracking**: Automatic deduction for paid leaves
- **Approval Workflow**: HR approval with email notifications
- **Working Days Calculation**: Excludes weekends automatically

### Salary Management
- **Automatic Deductions**: Unpaid leave days are deducted from salary
- **Salary Slips**: PDF generation with detailed breakdown
- **Email Notifications**: Employees receive salary slip notifications

### Email Notifications
- **Leave Requests**: HR receives notifications for new requests
- **Leave Approvals**: Employees receive approval/rejection emails
- **Salary Slips**: Employees notified when salary slips are generated

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Different permissions for different roles
- **Company Isolation**: Data separation between companies
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries

## 📧 Email Templates

The system includes professional HTML email templates for:
- Leave request notifications
- Leave approval/rejection updates
- Salary slip generation notifications

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables
2. Install dependencies: `npm install`
3. Start the server: `npm start`

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `dist` folder to your hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🔄 Version History

- **v1.0.0**: Initial release with core HR features
- **v1.1.0**: Added email notifications and leave balance tracking
- **v1.2.0**: Enhanced UI with card-based design and dark theme

---

**Built with ❤️ using modern web technologies**
