# Tekvwarho IT Solutions Ltd

A comprehensive IT solutions website with integrated admin dashboard, live chat, consultation booking system, and staff management.

![License](https://img.shields.io/badge/license-Proprietary-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue)

## 🏢 Company Information

**Tekvwarho IT Solutions Ltd** is a technology consulting and software development company registered in Canada and Nigeria. We specialize in IT Consulting, Software Development, Website Development, and Data Analytics.

### Contact Information

| | Canada | Nigeria |
|---|--------|---------|
| **Phone** | +1 (905) 781 9825 | +234 906 577 9323 |
| **Address** | 707 Finch Avenue West, North York, Ontario | 16 Orhono, Eku, Delta State |
| **Email** | efe.obukohwo@outlook.com | |

---

## 📋 Table of Contents

- [Features](#-features)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Admin Dashboard](#-admin-dashboard)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [License](#-license)

---

## ✨ Features

### Public Website
- 🎨 Responsive, modern design with mobile-first approach
- 📄 Service pages (IT Consulting, Software Development, Website Development, Data Analytics)
- 💼 Technology stack showcase
- 📝 Contact form with real-time validation and admin notifications
- 💬 Live chat widget (WebSocket-based, no login required)
- 📅 Consultation booking system with calendar integration
- 📱 Progressive enhancement for all browsers

### Admin Dashboard
- 📊 **Dashboard** - Real-time statistics and quick actions
- 📧 **Messages** - View, respond to, and manage contact form submissions
- 💬 **Chats** - Real-time live chat management with conversation history
- 📅 **Consultations** - Schedule, manage, and track consultation bookings
- 📈 **Analytics** - Visitor tracking, conversion metrics, and trends
- 👥 **Staff Management** - Add/edit staff, roles, permissions, password resets
- ⚙️ **Settings** - Business hours, notifications, email templates, data export
- 📋 **Audit Logs** - Complete activity tracking and compliance logging
- 🏆 **Performance** - Staff performance metrics, scores, and leaderboards

### Backend Features
- 🔒 JWT-based authentication with role-based access control (RBAC)
- 🔄 RESTful API architecture (52+ endpoints)
- ⚡ WebSocket support for real-time chat
- 📧 Email notification system (Nodemailer + SMTP)
- 📝 Comprehensive audit logging
- 🎯 Staff performance tracking and scoring
- 🏷️ Notes and tags system for lead management
- 📤 Data export (CSV, PDF reports)

---

## 📁 Project Structure

```
tekvwarho-it-solutions/
├── 📄 README.md                    # This file
├── 📄 TECH_STACK.md               # Technology stack documentation
├── 📄 FILE_STRUCTURE.md           # Detailed file structure
├── 📄 API_DOCUMENTATION.md        # Complete API reference
├── 📄 package.json                # Node.js dependencies
├── 📄 .env.example                # Environment variables template
│
├── 📂 admin/                      # Admin dashboard frontend
│   ├── index.html                 # Dashboard home (stats, quick actions)
│   ├── login.html                 # Authentication page
│   ├── messages.html              # Contact messages management
│   ├── chats.html                 # Live chat conversations
│   ├── consultations.html         # Booking management
│   ├── analytics.html             # Analytics and reports
│   ├── staff.html                 # Staff management
│   ├── settings.html              # System settings
│   ├── audit.html                 # Audit log viewer
│   ├── performance.html           # Staff performance tracking
│   ├── css/admin.css              # Admin styles
│   └── js/admin.js                # Admin JavaScript (1386 lines)
│
├── 📂 server/                     # Backend (Node.js + Express)
│   ├── index.js                   # Server entry point (port 5500)
│   ├── config/
│   │   └── database.js            # PostgreSQL pool configuration
│   ├── routes/
│   │   ├── admin.js               # Staff CRUD, auth routes
│   │   ├── analytics.js           # Analytics data routes
│   │   ├── audit-export.js        # Data export routes
│   │   ├── chat.js                # Chat message routes
│   │   ├── consultation.js        # Booking routes
│   │   ├── contact.js             # Contact form routes
│   │   ├── notes-tags.js          # Notes and tags routes
│   │   ├── performance.js         # Performance metrics routes
│   │   └── settings.js            # Settings CRUD routes
│   ├── middleware/
│   │   └── auth.js                # JWT verification, RBAC
│   ├── services/
│   │   ├── auditService.js        # Audit logging service
│   │   ├── emailService.js        # Email notifications
│   │   └── performanceService.js  # Performance calculations
│   └── websocket/
│       └── chatHandler.js         # WebSocket chat handler
│
├── 📂 database/
│   ├── schema.sql                 # Database schema (15+ tables)
│   └── seed.sql                   # Sample data
│
├── 📂 docs/
│   ├── PROJECT_DOCUMENTATION.md   # Project overview
│   ├── WIREFRAMES.md              # UI wireframes
│   └── CONTENT_STRATEGY.md        # Content guidelines
│
├── 📂 css/                        # Public website styles
│   └── styles.css                 # Main stylesheet
│
├── 📂 js/                         # Public website JavaScript
│   ├── main.js                    # Core functionality
│   ├── chat-widget.js             # Live chat widget
│   └── booking.js                 # Consultation booking
│
├── 📂 img/                        # Images and assets
│
└── 📂 Public HTML Pages           # Service & content pages
    ├── index.html                 # Homepage
    ├── about.html                 # About us
    ├── contact.html               # Contact page
    ├── portfolio.html             # Portfolio/case studies
    ├── blog.html                  # Blog
    ├── book-consultation.html     # Booking page
    ├── it-consulting.html         # IT Consulting service
    ├── software-development.html  # Software Development service
    ├── website-development.html   # Website Development service
    ├── data-analytics.html        # Data Analytics service
    └── tech-stack.html            # Technology showcase
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommended: 20.x)
- **PostgreSQL** 14+
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd.git
   cd Tekvwarho-IT-Solutions-Ltd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database**
   ```bash
   # Create database
   createdb tekvwarho_IT_solutions
   
   # Run schema
   psql -d tekvwarho_IT_solutions -f database/schema.sql
   
   # (Optional) Seed sample data
   psql -d tekvwarho_IT_solutions -f database/seed.sql
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   - 🌐 **Website:** http://localhost:5500
   - 👤 **Admin Dashboard:** http://localhost:5500/admin
   - 🔐 **Default Admin:** Check your .env file for credentials

---

## ⚙️ Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=5500
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tekvwarho_IT_solutions

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Admin Account (for initial setup)
ADMIN_EMAIL=admin@tekvwarho.com
ADMIN_PASSWORD=your-secure-password

# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@tekvwarho.com

# Optional: Email notifications
ADMIN_NOTIFICATION_EMAIL=admin@tekvwarho.com
```

---

## 📚 API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for the complete API reference.

### Quick Reference

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/admin/auth/*` | Login, logout, password management |
| Staff | `/api/admin/staff/*` | Staff CRUD, activation, permissions |
| Messages | `/api/messages/*` | Contact form management |
| Chats | `/api/chats/*` | Live chat sessions |
| Consultations | `/api/consultations/*` | Booking management |
| Analytics | `/api/analytics/*` | Dashboard statistics |
| Settings | `/api/settings/*` | System configuration |
| Audit | `/api/audit/*` | Activity logs |
| Performance | `/api/performance/*` | Staff metrics |
| Export | `/api/export/*` | Data export (CSV, PDF) |
| Notes/Tags | `/api/notes/*`, `/api/tags/*` | Lead management |

### Authentication

All admin endpoints require JWT authentication:

```javascript
// Request header
Authorization: Bearer <your-jwt-token>
```

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

---

## 👤 Admin Dashboard

### Access

Navigate to `http://localhost:5500/admin/login.html`

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | (from .env ADMIN_EMAIL) | (from .env ADMIN_PASSWORD) |

### Role Hierarchy

| Role | Permissions |
|------|------------|
| **Admin** | Full access - manage staff, settings, view all data |
| **Manager** | Manage messages, consultations, chats, view analytics |
| **Staff** | Limited access based on individual permissions |

### Permission Flags

- `can_manage_messages` - View/reply to contact messages
- `can_manage_consultations` - Manage bookings
- `can_manage_chats` - Handle live chats
- `can_view_analytics` - View analytics dashboard

---

## 🗃️ Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `staff` | Admin users with roles and permissions |
| `messages` | Contact form submissions |
| `consultations` | Consultation bookings |
| `chat_sessions` | Live chat sessions |
| `chat_messages` | Individual chat messages |
| `visitors` | Visitor tracking |
| `audit_logs` | Activity audit trail |
| `settings` | System configuration |
| `notes` | Notes attached to leads |
| `tags` | Tags for categorization |

### Entity Relationships

```
staff (1) ──── (N) audit_logs
staff (1) ──── (N) messages (assigned_to)
staff (1) ──── (N) consultations (assigned_to)
staff (1) ──── (N) chat_sessions (assigned_to)
messages (1) ──── (N) notes
consultations (1) ──── (N) notes
visitors (1) ──── (N) chat_sessions
```

---

## 📊 Staff Performance Tracking

The performance system calculates metrics for each staff member:

### Metrics Tracked

| Metric | Weight | Description |
|--------|--------|-------------|
| Message Conversion Rate | 25% | % of messages converted to leads |
| Consultation Completion Rate | 25% | % of consultations completed |
| Chat Response Rate | 20% | Chat sessions handled successfully |
| Average Response Time | 15% | Time to first reply |
| Activity Score | 15% | Total actions and active days |

### Performance Score

Staff receive a score from 0-100 based on weighted metrics:

```
Score = (Msg Rate × 0.25) + (Consult Rate × 0.25) + 
        (Chat Rate × 0.20) + (Response Score × 0.15) + 
        (Activity Score × 0.15)
```

### Leaderboard

View top performers at `/admin/performance.html`

---

## 🌐 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (256+ bits)
- [ ] Configure HTTPS/SSL
- [ ] Set up PostgreSQL with SSL
- [ ] Configure email SMTP
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy

### Cloud Deployment

Compatible with:
- **AWS** (EC2, RDS, ElasticBeanstalk)
- **Heroku**
- **DigitalOcean**
- **Vercel** (frontend only)
- **Railway**

---

## 🛠️ Development

### Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server (with nodemon)
npm run db:init    # Initialize database
npm run db:seed    # Seed sample data
npm test           # Run tests (if available)
```

### Code Style

- ES6+ JavaScript
- Async/await for asynchronous operations
- JSDoc comments for documentation
- Consistent error handling

### Testing

```bash
# Run API tests
npm test

# Test specific endpoint
curl -X GET http://localhost:5500/api/health
```

---

## 📝 Changelog

### v1.0.0 (January 2026)

- ✅ Initial release
- ✅ Public website with all service pages
- ✅ Admin dashboard with full CRUD
- ✅ Live chat with WebSocket
- ✅ Consultation booking system
- ✅ Staff management and RBAC
- ✅ Audit logging
- ✅ Settings management
- ✅ Data export functionality
- ✅ Staff performance tracking
- ✅ Notes and tags system

---

## 📄 License

Copyright © 2026 Tekvwarho IT Solutions Ltd. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

---

## 🤝 Support

For support, email **efe.obukohwo@outlook.com** or open an issue in this repository.

---

<p align="center">
  <strong>Built with ❤️ by Tekvwarho IT Solutions Ltd</strong><br>
  <em>Transforming businesses through innovative technology solutions</em>
</p>
