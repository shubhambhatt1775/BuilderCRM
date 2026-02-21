# 🏗️ Builder CRM

A high-performance, premium CRM system specifically designed for builders and real estate professionals. It automates lead generation by extracting potential client data directly from Gmail inboxes and provides a sophisticated dashboard for managing the entire sales funnel.

---

## ✨ Key Features

### 📨 Intelligent Lead Automation
- **Gmail Integration**: Real-time lead extraction from emails using IMAP.
- **Auto-Parsing**: Automatically captures sender names, emails, and project interests.
- **Scheduled Checks**: Background cron jobs check for new leads every 10 minutes.

### 🛡️ Admin Powerhouse
- **Analytics Dashboard**: Visual overview of lead distribution and sales performance.
- **Glassmorphism UI**: Premium, modern interface with smooth animations (Framer Motion).
- **Salesman Management**: Easily onboard salesmen and track their individual performance metrics.
- **Lead Assignment**: Distribute leads to specific team members with a single click.

### 💼 Salesman Workspace
- **Dedicated Dashboard**: Focused view on assigned leads only.
- **Follow-up Reminders**: Smart notification system for upcoming client meetings/calls.
- **Deal Closing**: Record "Won" deals with project details and monetary value.
- **Status Pipeline**: Progress leads through 'New' to 'Deal Won'.

---

## 🛠️ Tech Stack

- **Frontend**: ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
- **Backend**: ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white) ![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)
- **Automation**: Node-cron, IMAP, Mailparser.
- **Security**: JWT Authentication, Bcrypt password hashing.

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js**: v16+ recommended.
- **MySQL**: Local instance or cloud database (like Aiven or PlanetScale).
- **Gmail App Password**: For lead extraction (Standard login won't work).

### 1. Database Setup 🗄️

You can set up the database in two ways:

#### A. Automated Setup (Recommended)
1. Ensure your MySQL server is running.
2. Configure your database credentials in `backend/.env` (see below).
3. Run the initialization script:
   ```bash
   cd backend
   node setupDB.js
   ```
   *This script will create the database, tables, and a default admin user.*

#### B. Manual Setup
1. Create a database named `builder_crm`.
2. Import the SQL schema:
   ```bash
   mysql -u your_user -p builder_crm < backend/schema.sql
   ```

### 2. Environment Configuration 🔑

Create a `.env` file in the `backend` directory:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `DB_HOST` | MySQL database host | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD`| MySQL password | `yourpassword` |
| `DB_NAME` | Database name | `builder_crm` |
| `EMAIL_USER` | Gmail address for leads | `example@gmail.com` |
| `EMAIL_PASS` | Gmail **App Password** | `xxxx xxxx xxxx xxxx` |
| `JWT_SECRET` | Secret for auth tokens | `any_random_string` |

### 3. Installation & Run

#### Backend:
```bash
cd backend
npm install
npm run dev
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Default Access
- **URL**: `http://localhost:5173`
- **Admin Email**: `admin@example.com`
- **Admin Password**: `admin123`

---

## 📁 Project Structure
```text
BuilderCRM/
├── backend/
│   ├── config/      # DB Connection
│   ├── controllers/ # Business Logic
│   ├── routes/      # API Endpoints
│   ├── cron/        # Email Check Jobs
│   ├── schema.sql   # DB Schema
│   └── setupDB.js   # Initialization Script
├── frontend/
│   ├── src/
│   │   ├── components/ # Reusable UI
│   │   ├── pages/      # View Components
│   │   └── context/    # State Management
└── README.md
```
