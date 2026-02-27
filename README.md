# BuilderCRM - Advanced Lead Management System

A high-performance, production-ready CRM designed for real estate and service-based businesses. This system automates the bridge between email inquiries and mobile communication (WhatsApp/Calls), featuring a premium dashboard for both Admins and Sales Personnel.

## Core Features

### 1. Intelligent Lead Capture (Automation)
- **20-Minute Performance Window**: Optimized to scan only emails received in the last 20 minutes, preventing performance degradation in large inboxes.
- **24-Hour Smart Deduplication**: Prevents exact duplicates (Email + Subject) from being processed within a rolling 24-hour window.
- **Intelligent Sourcing**: Automatically identifies lead origins (MagicBricks, Housing.com, 99Acres, GitHub, Vercel, EmailJS, etc.)

### 2. WhatsApp Integration (The "Greeting" Engine)
- **Official Meta API**: Deep integration with WhatsApp Cloud API
- **Automated Greetings**: Template-based instant messaging to new leads
- **Status Tracking**: Live monitoring (Sent/Failed/Not Found/Not Configured)
- **One-Click Chat**: Direct `wa.me` links for manual follow-ups

### 3. Automated Missed Lead Follow-Up System
- **Intelligent Detection**: Identifies leads with no follow-up activity >48 hours
- **Automated WhatsApp Messages**: Sends polite follow-back messages to missed leads
- **Safety Rules**: One follow-up per lead, skips closed/no-phone leads
- **Scheduled Processing**: Runs every 6 hours (configurable cron jobs)
- **Manual Triggers**: API endpoints for on-demand processing
- **Comprehensive Logging**: Detailed success/failure tracking and statistics

### 4. Dual-Dashboard Architecture
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
│   ├── emailCronService.js  # Automated email scheduling
│   ├── whatsappService.js    # WhatsApp messaging
│   ├── whatsappLogger.js     # WhatsApp logging & analytics
│   ├── missedLeadService.js  # Missed lead detection
│   └── missedLeadCronService.js  # Missed lead scheduling
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
- **leads**: Lead data with status workflow, WhatsApp tracking, and missed follow-up fields
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

### Stage 5: Automated Follow-Up Recovery
```
48 Hours Pass → Check Lead Activity → No Follow-up? → Send WhatsApp Reminder → Log Interaction
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

2. **Run Database Migrations**:
   ```bash
   cd backend
   node runMigration.js
   ```

3. **Backend Setup**:
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
- **20-Minute Scan Optimization**: Drastic performance improvement by only scanning the most recent emails.
- **Smart Body Extraction Engine**: Prioritizes lead details (Name, Email, Mobile) from the email body text.
- **Automated "Unknown" Handling**: Handles missing lead names with sequential numbering (unknown clientX).
- **Dashboard Data Prioritization**: Dashboard now displays "True Lead" info extracted from body over email headers.
- **Lead Deletion Maintenance**: Added capability to clear leads for database reset/testing.
- **Smart Duplicate Prevention**: Only prevents exact duplicates (email + subject) within 24 hours.
- **Admin Won Deal Management**: Admins can now edit the status of "Deal Won" leads (e.g., reverting to Follow-up or correcting booking errors), while salesmen remain strictly restricted from altering won lead data.
- **Enhanced Status Revision Modal**: A new premium modal for admins allowing complex state transitions for closed deals with integrated validation.

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
- **Bcryptjs 3.0.3** - Password hashing

### Frontend Dependencies
- **React 18.2.0** - UI framework
- **React Router 6.22.2** - Navigation
- **TailwindCSS 3.4.1** - Styling
- **Lucide React 0.344.0** - Icons
- **Framer Motion 11.0.8** - Animations

---

## Missed Lead Follow-Up System

### System Overview
BuilderCRM includes an automated system that detects leads without recent follow-up activity and sends polite WhatsApp reminder messages to re-engage potential customers.

### Detection Criteria
- ✅ Lead is assigned to a salesman
- ✅ Lead has a valid phone number
- ✅ Lead status is NOT "Deal Won" or "Not Interested"
- ✅ No follow-up activity OR last follow-up is older than 48 hours
- ✅ Missed follow-up message not previously sent

### WhatsApp Message Template
```
Sorry for the delayed response. We tried reaching you earlier.
Please stay connected with us.
Call us on {{phone}} or email {{email}}.
```

### Automation Schedule
- **Default**: Every 6 hours (`0 */6 * * *`)
- **Testing**: Every 5 minutes (`*/5 * * *`) - for development/testing
- **Manual Trigger**: API endpoint for on-demand processing

### Safety Features
- **One Message Per Lead**: Prevents duplicate follow-ups
- **Phone Number Validation**: Skips leads without valid phone numbers
- **Closed Lead Protection**: Ignores "Deal Won" and "Not Interested" leads
- **Comprehensive Logging**: Tracks all attempts, successes, and failures
- **Error Recovery**: Continues processing even if individual messages fail

### Database Fields Added
```sql
ALTER TABLE leads 
ADD COLUMN missed_followup_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN last_followup_at TIMESTAMP NULL;
```

### Configuration
The system runs automatically when the backend server starts. To customize:

1. **Change Schedule**: Edit `missedLeadCronService.js`
2. **Modify Message**: Update `missedLeadService.js`
3. **Adjust Timeframe**: Change 48-hour threshold in the service
4. **Add Exclusions**: Modify detection criteria as needed

### API Endpoints
- `POST /api/process-missed-leads` - Manual processing trigger
- `GET /api/missed-leads-stats` - Current statistics and metrics

---

## API Endpoints
- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration

### Lead Management
- `GET /api/leads/all` - Get all leads (Admin)
- `GET /api/leads/my-leads` - Get assigned leads (Salesman)
- `POST /api/leads/assign` - Assign lead to salesman
- `POST /api/leads/update-status` - Update lead status
- `GET /api/leads/today-followups` - Get today's follow-ups
- `GET /api/leads/admin-reports` - Get performance reports
- `PUT /api/leads/update-won-status/:leadId` - Revision of won leads (Admin only)

### Email Operations
- `POST /api/fetch-emails` - Manual email fetch
- `POST /api/refresh-emails` - Refresh all emails

### Missed Lead Operations
- `POST /api/process-missed-leads` - Manually trigger missed lead processing
- `GET /api/missed-leads-stats` - Get missed lead statistics

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
