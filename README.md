# HRMS Backend

A Human Resource Management System backend built with Node.js, Express, and Supabase.

## 🚀 Features

- **Secure Authentication**: Supabase Auth integration with JWT tokens
- **Role-Based Access Control**: HR and Employee roles with proper permissions
- **Multi-Tenant Architecture**: Company-based data isolation
- **Row-Level Security**: Database-level security with RLS policies
- **Employee Management**: HR can add, update, delete, and manage employees
- **Password Management**: Auto-generated secure passwords for employees
- **API Security**: Rate limiting, CORS, and input validation

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project

## 🛠 Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys from the project settings
3. Run the SQL schema in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database/schema.sql
```

### 3. Environment Configuration

1. Copy the environment example file:
```bash
cp env.example .env
```

2. Update `.env` with your Supabase credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Supabase Auth Settings

In your Supabase dashboard:
1. Go to Authentication > Settings
2. Disable "Enable email confirmations"
3. Disable "Enable sign up" (only HR can sign up via API)

### 5. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

#### HR Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "hr@company.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "company_name": "Acme Corp"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "password"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <access_token>
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "<refresh_token>"
}
```

### User Management Endpoints (HR Only)

#### Add Employee
```http
POST /api/users/employees
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "employee@company.com",
  "full_name": "Jane Smith"
}
```

#### Get All Employees
```http
GET /api/users/employees
Authorization: Bearer <access_token>
```

#### Get Employee by ID
```http
GET /api/users/employees/:id
Authorization: Bearer <access_token>
```

#### Update Employee
```http
PUT /api/users/employees/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "updated@company.com",
  "full_name": "Updated Name"
}
```

#### Delete Employee
```http
DELETE /api/users/employees/:id
Authorization: Bearer <access_token>
```

#### Reset Employee Password
```http
POST /api/users/employees/:id/reset-password
Authorization: Bearer <access_token>
```

## 🔐 Security Features

### Row-Level Security (RLS)
- Users can only access data from their own company
- Automatic data isolation between companies
- Database-level security policies

### Authentication Flow
1. **HR Signup**: Only HR users can sign up via API
2. **Employee Creation**: HR creates employees with auto-generated passwords
3. **Login**: Both HR and employees can login with their credentials
4. **Token Management**: JWT tokens with refresh capability

### API Security
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Helmet security headers

## 🏗 Database Schema

### Users Table
```sql
- id (UUID) - Primary key, matches Supabase Auth user ID
- full_name (TEXT) - User's full name
- email (TEXT) - User's email address
- password (TEXT) - Auto-generated password for employees
- role (ENUM) - 'hr' or 'employee'
- company_id (UUID) - Foreign key to companies table
- created_at (TIMESTAMP) - Creation timestamp
- updated_at (TIMESTAMP) - Last update timestamp
```

### Companies Table
```sql
- id (UUID) - Primary key
- name (TEXT) - Company name
- created_at (TIMESTAMP) - Creation timestamp
- updated_at (TIMESTAMP) - Last update timestamp
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
JWT_SECRET=your_secure_jwt_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### PM2 Deployment
```bash
npm install -g pm2
pm2 start server.js --name "hrms-backend"
pm2 save
pm2 startup
```

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 