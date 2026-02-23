# BuilderCRM - Advanced Lead Management System

A high-performance, aesthetically pleasing CRM designed for real estate and service-based businesses. This system automates the bridge between email inquiries and mobile communication (WhatsApp/Calls), featuring a premium dashboard for both Admins and Sales Personnel.

## 🚀 Core Features

### 1. Intelligent Lead Capture (Automation)
- **Email Inflow Monitoring**: Real-time integration with Gmail/IMAP to detect new inquiries.
- **Robust Phone Extraction**: Advanced regex logic to identify mobile numbers from heterogeneous email content (subject and body), handling international formats and labels (e.g., "Mobile:", "Contact:").
- **Smart Sourcing**: Automatically identifies lead origins (MagicBricks, Housing.com, 99Acres, GitHub, Vercel, EmailJS, etc.) and tags them with curated badges.

### 2. WhatsApp Integration (The "Greeting" Engine)
- **Automated Greetings**: Deep integration with Meta's Official WhatsApp Cloud API.
- **Status Tracking**: Live monitoring of message status within the dashboard:
  - 🟢 **Sent**: Successfully delivered via API.
  - 🔴 **Failed**: API error or invalid number.
  - 🟡 **Not Configured**: Missing API credentials in `.env`.
  - ⚪ **Not Found**: No valid phone number detected in the email.
- **One-Click Chat**: Direct `wa.me` links for manual follow-ups.

### 3. Dual-Dashboard Architecture
- **Admin Control Center**:
  - **Performance Analytics**: Track salesman performance (Deals Won, Leads Assigned, Revenue).
  - **Delegate Engine**: Assign leads to specific salesmen in one click.
  - **Revenue Visualization**: Monthly trends and conversion tracking.
- **Salesman Interface**:
  - **Action-Oriented View**: Focus on assigned leads and immediate follow-ups.
  - **Click-to-Call**: Direct `tel:` integration for instant calling from mobile/desktop.
  - **Requirement Context**: Expandable views to read full email bodies without leaving the list.

### 4. Premium Design System
- **Rich Aesthetics**: Built with a sleek, low-clutter interface using glassmorphism influences and high-contrast typography.
- **Responsive Layout**: Optimized for both high-density desktop monitoring and on-the-go mobile handling.

---

## 🛠️ System Workflow

### Stage 1: The Capture
An email arrives in the monitored inbox. The **Backend Email Service** parses the content within seconds, extracts the sender's details, identifies the source, and scans for a 10+ digit phone number.

### Stage 2: The Automation
If a phone number is found and WhatsApp API keys are present, the system fires an **Official WhatsApp Greeting** (Template-based) to the customer instantly. The result is logged in the database.

### Stage 3: The Delegation
The Admin sees the new lead in the **Control Center**. They can instantly see if the automated message was sent. The Admin then "Assigns" the lead to a Salesman.

### Stage 4: The Conversion
The Salesman is notified on their dashboard. They can click the **Phone icon** to call or the **WhatsApp icon** to continue the conversation. Once the talk is over, they update the status to "Follow-up" or "Won."

---

## ⚙️ Setup & Configuration

### Backend Environment (`backend/.env`)
```text
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=builder_crm

# Email Automation (Gmail App Password)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Authentication
JWT_SECRET=any_random_string

# Official WhatsApp API (Meta Cloud API)
WHATSAPP_TOKEN=your_meta_access_token
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_GREETING_TEMPLATE=hello_world
```

### Installation
1. **Database**: Import the provided schema into MySQL.
2. **Backend**: `cd backend && npm install && npm run dev`
3. **Frontend**: `cd frontend && npm install && npm run dev`

---

## 🎨 Technology Stack
- **Frontend**: React.js, TailwindCSS (v3), Lucide-React Icons.
- **Backend**: Node.js, Express, MySQL (pool connections).
- **Communication**: IMAP (Email), Meta Cloud API (WhatsApp), Axios.
