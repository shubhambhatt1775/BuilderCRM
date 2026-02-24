# BuilderCRM - Advanced Lead Management System

A high-performance, production-ready CRM designed for real estate and service-based businesses. This system automates the bridge between email inquiries and mobile communication (WhatsApp/Calls), featuring a premium dashboard for both Admins and Sales Personnel.

## Core Features

### 1. Intelligent Lead Capture (Automation)
- **Real-time Email Monitoring**: Automated IMAP integration with configurable fetching intervals
- **Smart Duplicate Prevention**: Prevents exact duplicates while allowing multiple emails from same sender
- **Robust Phone Extraction**: Advanced regex logic to identify mobile numbers from heterogeneous email content
- **Intelligent Sourcing**: Automatically identifies lead origins (MagicBricks, Housing.com, 99Acres, GitHub, Vercel, EmailJS, etc.)

### 2. WhatsApp Integration (The "Greeting" Engine)
- **Official Meta API**: Deep integration with WhatsApp Cloud API
- **Automated Greetings**: Template-based instant messaging to new leads
- **Status Tracking**: Live monitoring (Sent/Failed/Not Found/Not Configured)
- **One-Click Chat**: Direct `wa.me` links for manual follow-ups

### 3. Dual-Dashboard Architecture
- **Admin Control Center**:
  - Performance analytics with success percentage display
  - Lead delegation and assignment system
  - Revenue tracking and monthly trends
  - Real-time email refresh functionality
- **Salesman Interface**:
  - Action-oriented lead management view
  - Click-to-call and WhatsApp integration
  - Follow-up scheduling and status updates
  - Chronological lead ordering (oldest first)

### 4. Premium Design System
- **Modern UI**: Glassmorphism influences with high-contrast typography
- **Responsive Layout**: Optimized for desktop monitoring and mobile handling
- **Success Metrics**: Visual progress bars with percentage displays

---

## Technical Architecture

### Backend (Node.js + Express)
```
├── config/db.js              # MySQL connection pool
├── controllers/leadController.js  # Lead business logic
├── middleware/auth.js         # JWT authentication
├── routes/                  # API endpoints
│   ├── leadRoutes.js         # Lead management
│   └── userRoutes.js        # User authentication
├── services/                # Core services
│   ├── emailService.js       # Email processing
│   └── emailCronService.js  # Automated scheduling
├── server.js               # Express server
└── ultimateEmailFetch.js   # Primary email fetching
```

### Frontend (React + Vite)
```
├── src/
│   ├── context/AuthContext.jsx    # Global auth state
│   ├── pages/                  # Main components
│   │   ├── AdminDashboard.jsx     # Admin control center
│   │   ├── SalesmanDashboard.jsx  # Salesman workspace
│   │   └── Login.jsx            # Authentication
│   ├── App.jsx                 # Router setup
│   └── main.jsx               # React entry
```

### Database Schema (MySQL)
- **users**: User management with role-based access
- **leads**: Lead data with status workflow
- **followups**: Follow-up scheduling and tracking
- **bookings**: Deal closure and revenue tracking

---

## System Workflow

### Stage 1: Automated Capture
```
Email → IMAP Service → Parse Content → Extract Details → Store in Database
```

### Stage 2: Smart Outreach
```
Phone Detected? → Send WhatsApp Greeting → Log Status → Update Lead
```

### Stage 3: Admin Delegation
```
Review New Leads → Check WhatsApp Status → Assign to Salesman → Update Status
```

### Stage 4: Sales Conversion
```
Salesman Notified → Contact Lead → Update Status → Close Deal → Track Revenue
```

---

## Setup & Configuration

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=builder_crm

# Email Automation
EMAIL_USER=your_email@domain.com
EMAIL_PASS=your_app_password

# Authentication
JWT_SECRET=your_jwt_secret

# WhatsApp API
WHATSAPP_TOKEN=your_meta_access_token
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_GREETING_TEMPLATE=hello_world
```

### Installation Steps
1. **Database Setup**:
   ```bash
   mysql -u root -p < backend/schema.sql
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Key Features & Improvements

### Recent Updates
- **Smart Duplicate Prevention**: Only prevents exact duplicates (email + subject)
- **Automated Email Fetching**: Cron job runs every 5 minutes
- **Manual Refresh**: On-demand email fetching from dashboard
- **Success Percentage Display**: Visual metrics with percentage numbers
- **Clean Project Structure**: Removed all test and unnecessary files
- **Chronological Ordering**: Oldest leads displayed first

### Core Capabilities
- **Real-time Processing**: Instant email-to-lead conversion
- **Multi-channel Communication**: Email + WhatsApp + Phone integration
- **Role-based Access**: Admin and Salesman interfaces
- **Performance Analytics**: Conversion tracking and revenue metrics
- **Mobile Responsive**: Works on all device sizes

---

## Technology Stack

### Backend Dependencies
- **Express 5.2.1** - Web framework
- **MySQL2 3.17.4** - Database driver
- **IMAP 0.8.19** - Email fetching
- **Node-cron 4.2.1** - Task scheduling
- **JWT 9.0.3** - Authentication
- **Axios 1.13.5** - HTTP requests

### Frontend Dependencies
- **React 18.2.0** - UI framework
- **React Router 6.22.2** - Navigation
- **TailwindCSS 3.4.1** - Styling
- **Lucide React 0.344.0** - Icons
- **Framer Motion 11.0.8** - Animations

---

## API Endpoints

### Authentication
- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration

### Lead Management
- `GET /api/leads/all` - Get all leads (Admin)
- `GET /api/leads/my-leads` - Get assigned leads (Salesman)
- `POST /api/leads/assign` - Assign lead to salesman
- `POST /api/leads/update-status` - Update lead status
- `GET /api/leads/today-followups` - Get today's follow-ups
- `GET /api/leads/admin-reports` - Get performance reports

### Email Operations
- `POST /api/fetch-emails` - Manual email fetch
- `POST /api/refresh-emails` - Refresh all emails

---

## Development & Production

### Development Mode
```bash
# Backend (Port 5000)
cd backend && npm run dev

# Frontend (Port 5173)
cd frontend && npm run dev
```

### Production Deployment
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build
```

---

## Performance Features

### Email Processing
- **Batch Processing**: Handles multiple emails efficiently
- **Error Recovery**: Robust error handling and retry logic
- **Memory Management**: Optimized for high-volume processing

### Database Optimization
- **Connection Pooling**: Efficient MySQL connections
- **Indexed Queries**: Fast data retrieval
- **Foreign Key Constraints**: Data integrity

### Frontend Performance
- **Component Optimization**: Efficient React rendering
- **Lazy Loading**: Optimized for large datasets
- **Responsive Design**: Mobile-first approach

---

## UI/UX Highlights

- **Glassmorphism Design**: Modern, premium aesthetic
- **Micro-interactions**: Smooth hover states and transitions
- **Data Visualization**: Progress bars and metrics
- **Accessibility**: WCAG compliant design
- **Mobile Optimization**: Touch-friendly interface

---

*BuilderCRM is production-ready with comprehensive automation, modern design, and scalable architecture.*
