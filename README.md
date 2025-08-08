# WorkFlowHR (Human Resource Management System)

A modern, full-stack Human Resource Management System built with Node.js, Express, React, and Supabase.

## 🚀 Features

- **User Management**: Complete employee lifecycle management
- **Leave Management**: Request, approve, and track leave
- **Salary Management**: Generate and manage salary slips
- **Document Management**: Create and generate HR documents
- **Company Calendar**: Manage company events and holidays
- **Role-based Access**: Admin, HR Manager, HR Staff, and Employee roles
- **Real-time Notifications**: Email notifications for important events
- **Modern UI**: Responsive design with dark mode support
- **Production Ready**: Security, monitoring, logging, and scalability

## 🛠 Tech Stack

### Backend
- **Node.js** (v18+) - Runtime environment
- **Express.js** - Web framework
- **Supabase** - PostgreSQL database and authentication
- **JWT** - Authentication and authorization
- **Nodemailer** - Email notifications
- **Redis** - Caching and sessions
- **Helmet** - Security headers
- **Rate Limiting** - API protection

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Redis (for production)

## 🚀 Quick Start

### Development Mode

1. **Clone the repository:**
```bash
git clone <repository-url>
cd WorkFlowHR
```

2. **Install backend dependencies:**
```bash
npm install
```

3. **Install frontend dependencies:**
```bash
cd frontend
npm install
cd ..
```

4. **Set up environment variables:**
```bash
cp env.example .env
# Edit .env with your configuration
```

5. **Start development servers:**
```bash
# Backend (in one terminal)
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

6. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api
   - Health Check: http://localhost:3000/health

## 🏭 Production Deployment

### Manual Deployment

1. **Set up environment variables:**
```bash
cp env.example .env
# Configure all production variables
```

2. **Install dependencies:**
```bash
npm install --production
```

3. **Build frontend:**
```bash
cd frontend
npm run build
cd ..
```

4. **Start the server:**
```bash
npm start
```

### Using PM2 (Recommended for Production)

1. **Install PM2 globally:**
```bash
npm install -g pm2
```

2. **Start the application:**
```bash
pm2 start server.js --name "workflowhr-backend"
```

3. **Monitor the application:**
```bash
pm2 monit
pm2 logs
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT
JWT_SECRET=your_jwt_secret

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (Optional)
REDIS_URL=redis://localhost:6379
```

### Email Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password** for the application
3. **Set EMAIL_USER and EMAIL_PASS** in your `.env` file
4. **Test email configuration:**
```bash
npm run test-email
```

## 🔒 Security Features

- **Helmet.js**: Security headers and CSP
- **Rate Limiting**: API protection against abuse
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Request validation and sanitization
- **JWT Authentication**: Secure token-based auth
- **Environment Variables**: Secure configuration management

## 📊 Monitoring & Logging

- **Request Logging**: All API requests are logged
- **Error Logging**: Detailed error tracking
- **Health Checks**: `/health` endpoint for monitoring
- **Performance Monitoring**: Response time tracking

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🔧 Development

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run check-format

# Security audit
npm run security-check
```

## 📁 Project Structure

```
HRMS/
├── controllers/          # Route controllers
├── middleware/           # Custom middleware
├── routes/              # API routes
├── utils/               # Utility functions
├── frontend/            # React frontend
├── config/              # Configuration files
├── server.js            # Express server
└── package.json         # Dependencies
```

## 🚨 Troubleshooting

### Common Issues

1. **Email not sending:**
   - Check EMAIL_USER and EMAIL_PASS in .env
   - Verify Gmail app password is correct
   - Run `npm run test-email` to test configuration

2. **Database connection issues:**
   - Verify Supabase credentials in .env
   - Check network connectivity
   - Ensure database is accessible

3. **CORS errors:**
   - Check CORS configuration in server.js
   - Verify frontend URL is in allowed origins

4. **Rate limiting:**
   - Adjust RATE_LIMIT_MAX_REQUESTS in .env
   - Check if requests are coming from same IP

### Logs

- **Application logs**: Check console output
- **Error logs**: Look for error messages in console
- **Request logs**: All API requests are logged with timestamps

## 📄 License

This project is licensed under the MIT License.

## 🤝 Support

For support, please open an issue on GitHub or contact the development team.

## 📝 Changelog

### v1.0.0
- Initial release
- Complete HR management system
- Production-ready features
- Security enhancements
- Email notifications
- Role-based access control
