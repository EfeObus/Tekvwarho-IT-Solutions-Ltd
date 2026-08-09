# Tekvwa IT Solutions Ltd

A comprehensive IT solutions website with integrated admin dashboard, live chat, consultation booking system, and staff management.

![License](https://img.shields.io/badge/license-Proprietary-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue)
![Version](https://img.shields.io/badge/version-1.7.0-orange)

## Company Information

**Tekvwa IT Solutions Ltd** is a technology consulting and software development company registered in Nigeria. We specialize in IT Consulting, Software Development, Website Development, and Data Analytics.

### Contact Information

| | Nigeria |
|---|---------|
| **Phone** | +234 906 577 9323 |
| **Address** | 16 Orhono, Eku, Delta State |
| **Email** | info@tekvwa.org |
| **Registration** | CAC, Ughelli, Delta State &mdash; RC 9748441 |

---

## Table of Contents

- [Features](#-features)
- [Security Features](#-security-features)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Admin Dashboard](#-admin-dashboard)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Documentation](#-documentation)
- [Deployment](#-deployment)
- [Changelog](#-changelog)
- [License](#-license)

---

## Features

### Public Website
- Responsive, modern design with mobile-first approach - verified with zero horizontal overflow across desktop/tablet/phone breakpoints
- "Company" nav dropdown (About, Meet the Team, Tech Stack, Careers) on every page
- Service pages (IT Consulting, Software Development, Website Development, Data Analytics)
- Team page (`team.html`) introducing company leadership
- Technology stack showcase
- Careers page with a working "Get in Touch" flow (routes to the contact form, not a bare `mailto:` link)
- Contact form with real-time validation, admin notifications, and a careers-inquiry option
- Live chat widget (WebSocket-based, no login required)
- Consultation booking system with calendar integration and a 3-step progress indicator
- Progressive enhancement for all browsers
- Legal pages (Privacy Policy, Terms of Service, Cookie Policy)

### Admin Dashboard
- **Dashboard** - Real-time statistics, quick actions, and onboarding
- **Messages** - View, respond to, and manage contact form submissions
- **Chats** - Real-time live chat management, plus a read-only History tab for browsing closed conversations
- **Consultations** - Schedule, manage, and track consultation bookings
- **Analytics** - Visitor tracking, conversion metrics, and trends
- **Staff Management** - Add/edit staff, roles, permissions, password resets
- **Payroll** - Accountant/admin dashboard for monthly salaries (NGN); salary changes are admin-only
- **Tickets** - Internal helpdesk for IT Support requests and Development tasks/bugs
- **Handbook** - Employee Handbook and Code of Conduct with per-staff acknowledgment tracking
- **Letterhead** (Admin only) - Generate official correspondence as branded PDF or Word documents
- **Compliance** - Filing-deadline tracker, document vault (Cloud Storage-backed), and company notices
- **Settings** - Business hours, notifications, email templates, data export
- **Audit Logs** - Complete activity tracking and compliance logging
- **Performance** - Staff performance metrics, scores, and leaderboards
- **My Profile** - Self-service profile editing and password change for any staff/admin
- **Search & Filters** - Advanced search, date range filters, pagination
- **Saved Replies** - Quick response templates with keyboard shortcuts
- **Drafts** - Auto-save drafts for messages and replies
- **Onboarding** - First-time user onboarding with guided tour

### Backend Features
- JWT-based authentication with refresh tokens and session management
- Role-based access control (RBAC) with granular permissions
- RESTful API architecture (60+ endpoints)
- WebSocket support for real-time chat
- Email notification system (Nodemailer + SMTP)
- Comprehensive audit logging
- Staff performance tracking and scoring
- Notes and tags system for lead management
- Data export (CSV, PDF reports)
- Rate limiting and abuse protection
- Input sanitization and XSS protection
- Security headers (CSP, HSTS, X-Frame-Options)

---

## Security Features

### Authentication & Session Management
| Feature | Implementation |
|---------|---------------|
| Access Tokens | JWT, 15-minute expiry |
| Refresh Tokens | 7-day expiry, stored in database |
| Token Rotation | New refresh token on each use |
| Session Revocation | Logout single or all sessions |
| Password Policies | Minimum 8 characters, change enforcement |

### Rate Limiting
| Route | Limit | Window |
|-------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Contact Form | 3 submissions | 1 hour |
| Newsletter | 5 attempts | 1 hour |
| Chat Messages | 30 messages | 1 minute |
| API (authenticated) | 100 requests | 1 minute |
| API (public) | 30 requests | 1 minute |

### Security Headers
- Content Security Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (geolocation, microphone, camera disabled)

### Input Protection
- XSS sanitization on all user inputs
- HTML escaping in responses
- SQL injection prevention (parameterized queries)
- File upload validation

---

## Project Structure

```
tekvwa-it-solutions/
├── README.md # This file
├── ROADMAP.md # Security & Feature Roadmap
├── SECURITY_POLICY.md # Security policies and procedures
├── BACKUP_RECOVERY.md # Backup and disaster recovery plan
├── TECH_STACK.md # Technology stack documentation
├── FILE_STRUCTURE.md # Detailed file structure
├── API_DOCUMENTATION.md # Complete API reference
├── package.json # Node.js dependencies
├── .env.example # Environment variables template
│
├── admin/ # Admin dashboard frontend
│ ├── index.html # Dashboard home (stats, quick actions)
│ ├── login.html # Authentication page
│ ├── messages.html # Contact messages management
│ ├── chats.html # Live chat conversations
│ ├── consultations.html # Booking management
│ ├── analytics.html # Analytics and reports
│ ├── staff.html # Staff management
│ ├── settings.html # System settings
│ ├── audit.html # Audit log viewer
│ ├── performance.html # Staff performance tracking
│ ├── css/
│ │ ├── admin.css # Main admin styles
│ │ ├── onboarding.css # Onboarding & empty states
│ │ ├── dataTable.css # Search, filters, pagination
│ │ └── savedReplies.css # Saved replies styles
│ └── js/
│ ├── admin.js # Core admin JavaScript
│ ├── onboarding.js # Onboarding system
│ └── components/
│ ├── dataTable.js # Data table with search/pagination
│ └── savedReplies.js # Saved replies manager
│
├── server/ # Backend (Node.js + Express)
│ ├── index.js # Server entry point (port 5500)
│ ├── config/
│ │ └── database.js # PostgreSQL pool configuration
│ ├── models/
│ │ ├── Staff.js # Staff model
│ │ ├── Message.js # Message model
│ │ ├── Chat.js # Chat model
│ │ ├── Consultation.js # Consultation model
│ │ ├── Visitor.js # Visitor model
│ │ ├── SavedReply.js # Saved replies model
│ │ └── Draft.js # Drafts model
│ ├── routes/
│ │ ├── admin.js # Staff CRUD, auth routes
│ │ ├── auth.js # Token refresh, sessions
│ │ ├── analytics.js # Analytics data routes
│ │ ├── audit-export.js # Data export routes
│ │ ├── chat.js # Chat message routes
│ │ ├── consultation.js # Booking routes
│ │ ├── contact.js # Contact form routes
│ │ ├── messages.js # Messages with search/pagination
│ │ ├── notes-tags.js # Notes and tags routes
│ │ ├── newsletter.js # Newsletter subscription
│ │ ├── performance.js # Performance metrics routes
│ │ ├── savedReplies.js # Saved replies CRUD
│ │ └── settings.js # Settings CRUD routes
│ ├── middleware/
│ │ ├── auth.js # JWT verification, RBAC
│ │ ├── rateLimiter.js # Rate limiting
│ │ ├── sanitizer.js # Input sanitization
│ │ ├── securityHeaders.js # Security headers
│ │ ├── errorHandler.js # Global error handler
│ │ └── pagination.js # Pagination middleware
│ ├── services/
│ │ ├── auditService.js # Audit logging service
│ │ ├── emailService.js # Email notifications
│ │ ├── performanceService.js # Performance calculations
│ │ └── tokenManager.js # JWT token management
│ ├── utils/
│ │ └── queryBuilder.js # Dynamic SQL query builder
│ └── websocket/
│ └── chatHandler.js # WebSocket chat handler
│
├── database/
│ ├── schema.sql # Database schema (20+ tables)
│ ├── init.js # Database initialization
│ └── migrations/
│ └── 003_saved_replies_drafts.sql
│
├── docs/
│ ├── ARCHITECTURE.md # System architecture diagrams
│ ├── API_DOCUMENTATION.md # Full API reference
│ ├── DATABASE_SCHEMA.md # ERD and table documentation
│ ├── PROJECT_DOCUMENTATION.md # Project overview
│ ├── WIREFRAMES.md # UI wireframes
│ └── CONTENT_STRATEGY.md # Content guidelines
│
├── css/ # Public website styles
│ └── styles.css # Main stylesheet
│
├── js/ # Public website JavaScript
├── js/ # Frontend JavaScript
│ ├── main.js # Core functionality
│ ├── chat-widget.js # Live chat widget
│ ├── booking.js # Consultation booking
│ ├── cookie-consent.js # GDPR cookie consent manager
│ └── tracking.js # Analytics tracking
│
├── img/ # Images and assets
│
└── Public HTML Pages # Service & content pages
    ├── index.html # Homepage
    ├── about.html # About us
    ├── contact.html # Contact page
    ├── portfolio.html # Portfolio/case studies
    ├── blog.html # Blog
    ├── book-consultation.html # Booking page
    ├── it-consulting.html # IT Consulting service
    ├── software-development.html # Software Development service
    ├── website-development.html # Website Development service
    ├── data-analytics.html # Data Analytics service
    ├── tech-stack.html # Technology showcase
    ├── privacy-policy.html # Privacy Policy
    ├── terms-of-service.html # Terms of Service
    └── cookie-policy.html # Cookie Policy
```

---

## Quick Start

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
   createdb tekvwa_it_solutions
   
   # Run schema
   psql -d tekvwa_it_solutions -f database/schema.sql
   
   # Run migrations
   psql -d tekvwa_it_solutions -f database/migrations/003_saved_replies_drafts.sql
   
   # (Optional) Seed sample data
   psql -d tekvwa_it_solutions -f database/seed.sql
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   - **Website:** http://localhost:5500
   - **Admin Dashboard:** http://localhost:5500/admin
   - **Default Admin:** Check your .env file for credentials

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=5500
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tekvwa_it_solutions

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here-min-256-bits
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# Admin Account (for initial setup)
ADMIN_EMAIL=admin@tekvwa.org
ADMIN_PASSWORD=your-secure-password

# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@tekvwa.org

# Optional: Email notifications
ADMIN_NOTIFICATION_EMAIL=admin@tekvwa.org

# Security (Production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## API Documentation

See [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for the complete API reference.

### Quick Reference

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/admin/login`, `/api/auth/*` | Login, logout, token refresh |
| Staff | `/api/admin/staff/*` | Staff CRUD, activation, permissions |
| Messages | `/api/messages/*` | Contact form management with search |
| Chats | `/api/chats/*` | Live chat sessions |
| Consultations | `/api/consultations/*` | Booking management |
| Analytics | `/api/analytics/*` | Dashboard statistics |
| Settings | `/api/settings/*` | System configuration |
| Audit | `/api/audit/*` | Activity logs |
| Performance | `/api/performance/*` | Staff metrics |
| Export | `/api/export/*` | Data export (CSV, PDF) |
| Notes/Tags | `/api/notes/*`, `/api/tags/*` | Lead management |
| Saved Replies | `/api/saved-replies/*` | Quick response templates |

### Authentication

All admin endpoints require JWT authentication:

```javascript
// Request header
Authorization: Bearer <your-access-token>
```

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh endpoint:

```javascript
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

---

## Admin Dashboard

### Access

Navigate to `http://localhost:5500/admin/login.html`

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | (from .env ADMIN_EMAIL) | (from .env ADMIN_PASSWORD) |

### Role Hierarchy

| Role | Permissions |
|------|------------|
| **Admin** | Full access - manage staff, settings, salaries, view all data |
| **Manager** | Manage messages, consultations, chats, view analytics |
| **HR** | Manage staff records, onboarding (create/activate/deactivate/reset-password) |
| **Accountant** | View and process payroll; cannot change a staff member's salary |
| **Staff** | Limited access based on individual permissions |

### Permission Flags

- `can_manage_messages` - View/reply to contact messages
- `can_manage_consultations` - Manage bookings
- `can_manage_chats` - Handle live chats
- `can_view_analytics` - View analytics dashboard
- `can_manage_employees` - Manage staff records (HR)
- `can_manage_payroll` - View/process payroll (Accountant)

Bulk CSV/report exports additionally require the **Manager** or **Admin** role tier, regardless of the flags above — matching the principle that regular staff shouldn't be able to bulk-export customer data.

### Department Defaults

Selecting a department when adding staff (Staff page → Add Staff) suggests sensible default permissions, which can still be overridden before saving:

| Department | Default role | Messages | Consultations | Chats | Analytics | Employees | Payroll | Tickets |
|---|---|---|---|---|---|---|---|---|
| Management | Admin | ✓ | ✓ | ✓ | ✓ | | | |
| Customer Service | Staff | ✓ | | ✓ | | | | |
| Sales | Staff | | ✓ | | | | | |
| Development | Staff | | | | ✓ | | | ✓ |
| IT Support | Staff | ✓ | | ✓ | | | | ✓ |
| Human Resources | HR | | | | | ✓ | | |
| Accounting | Accountant | | | | | | ✓ | |

Setting the role to **Manager** for any department adds analytics visibility and export rights on top of that department's base access — the "Lead" tier gets reporting + export, "Regular Staff" doesn't. This mirrors standard least-privilege / separation-of-duties practice: staff get only what their day-to-day work requires, leads get the added oversight that comes with running a team.

Development and IT Support are scoped conservatively on customer-facing data — Development gets read-only analytics rather than write access to customer records (no legitimate reason to edit customer PII), and IT Support shares Customer Service's inbox access. Both departments instead get `can_manage_tickets` by default, for the internal Tickets queue (see below). A dedicated sales pipeline view for Sales, or a fuller dev-facing project tracker beyond the ticket queue, would still be new feature work.

### Payroll & Salary Access

Salary data is deliberately isolated from the general staff-management flow:

- `GET /api/admin/payroll/staff` (Accountant or Admin) lists all active staff with their monthly salary (NGN), for the **Payroll** dashboard page.
- `PUT /api/admin/staff/:id/salary` is **admin-only** - an Accountant can view and process payroll but cannot set or change a salary figure, including their own. A raise always requires Admin sign-off.
- `GET /api/admin/staff/:id/salary` is available to Admin, Accountant, or the staff member viewing their own salary.
- Salary changes are audit-logged via `AuditService.logStaffChange` with the old and new amounts.

This is a separation-of-duties control, not just a UI convenience — it's enforced server-side and was verified against production (Accountant gets HTTP 403 attempting to call the salary-edit endpoint directly).

### Payroll Tax Compliance (Nigeria / Delta State)

- **NIN** (National Identification Number) is mandatory for every new hire; **TIN** (Tax ID) is optional at hire and flagged as "pending" on the staff list until HR registers the employee with DBIR and records it — the app tracks this, it doesn't submit to DBIR itself (no public API exists for that).
- Paystubs auto-calculate **PAYE tax** using the standard federal graduated table (`server/services/payeService.js`): Consolidated Relief Allowance (higher of ₦200,000 or 1% of gross, plus 20% of gross), then bands of 7/11/15/19/21/24%. This is Personal Income Tax Act law, not Delta-specific — DBIR is the remittance recipient for residents.
- The **DBIR Development Levy** (₦100/year, prorated monthly) is also auto-applied.
- **Pension (PRA 2014) and NHF are deliberately not implemented** — the company isn't enrolling in those yet.
- `GET /api/paystubs/dbir-schedule?month=&year=` exports a CSV (Employee Name, NIN, TIN, Gross, CRA, PAYE) ready for the DBIR portal.
- The PAYE bands are current as of when this was built, but Nigeria's tax rules have seen active reform — have an accountant verify against FIRS's own calculator before relying on this for real payroll.

### New Features

#### Onboarding System
First-time users see:
- Welcome modal with feature overview
- Guided tour of dashboard features
- Checklist widget tracking setup progress
- Empty states with helpful tips

#### Search & Filters
- Full-text search across messages, chats, consultations
- Status filters (new, pending, resolved, closed)
- Date range filters
- Sortable columns
- Pagination with configurable page size

#### Saved Replies
- Create quick response templates
- Keyboard shortcuts for fast access
- Categories for organization
- Variable placeholders ({{name}}, {{date}})

---

## Database Schema

See [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) for complete ERD and table documentation.

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
| `refresh_tokens` | JWT refresh tokens |
| `saved_replies` | Quick response templates |
| `drafts` | Auto-saved message drafts |

### Entity Relationships

```
staff (1) ──── (N) audit_logs
staff (1) ──── (N) messages (assigned_to)
staff (1) ──── (N) consultations (assigned_to)
staff (1) ──── (N) chat_sessions (assigned_to)
staff (1) ──── (N) saved_replies
staff (1) ──── (N) drafts
staff (1) ──── (N) refresh_tokens
messages (1) ──── (N) notes
consultations (1) ──── (N) notes
visitors (1) ──── (N) chat_sessions
```

---

## Security

### Security Documentation

| Document | Description |
|----------|-------------|
| [SECURITY_POLICY.md](./SECURITY_POLICY.md) | Security policies and procedures |
| [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) | Backup and disaster recovery plan |

### Reporting Security Issues

If you discover a security vulnerability, please email **info@tekvwa.org** with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

Do not open public issues for security vulnerabilities.

---

## Documentation

| Document | Location | Description |
|----------|----------|-------------|
| README | [README.md](./README.md) | This file - project overview |
| Roadmap | [ROADMAP.md](./ROADMAP.md) | Feature roadmap and implementation status |
| API Reference | [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) | Complete REST API documentation |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture diagrams |
| Database Schema | [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | ERD and table documentation |
| Security Policy | [SECURITY_POLICY.md](./SECURITY_POLICY.md) | Security policies and procedures |
| Data Protection Policy | [DATA_PROTECTION_POLICY.md](./DATA_PROTECTION_POLICY.md) | NDPA/NDPR compliance framework |
| Backup & Recovery | [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) | Disaster recovery plan |
| Tech Stack | [TECH_STACK.md](./TECH_STACK.md) | Technology stack overview |
| File Structure | [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) | Detailed file structure |

---

## Staff Performance Tracking

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

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (256+ bits)
- [ ] Use strong `JWT_REFRESH_SECRET` (256+ bits)
- [ ] Configure HTTPS/SSL
- [ ] Set up PostgreSQL with SSL
- [ ] Configure email SMTP
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy (see [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md))
- [ ] Review security headers
- [ ] Enable rate limiting
- [ ] Set up log rotation

### Cloud Deployment

**Currently deployed on Google Cloud** (Cloud Run + Cloud SQL + a global HTTPS load balancer) at [tekvwa.org](https://tekvwa.org). See `DEPLOYMENT.md` for the full setup.

Also compatible with:
- **AWS** (EC2, RDS, ElasticBeanstalk)
- **Heroku**
- **DigitalOcean**
- **Vercel** (frontend only)
- **Azure** (App Service, Azure Database for PostgreSQL)

---

## Development

### Scripts

```bash
npm start # Start production server
npm run dev # Start development server (with nodemon)
npm run db:init # Initialize database
npm run db:seed # Seed sample data
npm test # Run tests (if available)
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

# Test with authentication
curl -X GET http://localhost:5500/api/messages \
  -H "Authorization: Bearer <your-token>"
```

---

## Changelog

### v1.7.0 (August 9, 2026)

#### Payroll Tax Compliance
- NIN (mandatory) and TIN (optional, flagged if missing) fields on staff.
- Real PAYE tax calculation (federal graduated table) and DBIR
  Development Levy, auto-applied on every generated paystub.
- DBIR PAYE Schedule CSV export for the Delta State tax portal.
- Pension and NHF intentionally excluded (not yet enrolled).

#### Document Branding & Generation
- Real logo and blue-gradient letterhead on every generated PDF (fixed a
  pdfkit layout bug in the process - see the code comments in
  `pdfService.js` for what `doc.y` actually does).
- New company Letterhead generator (Admin only): branded PDF or Word
  (.docx) official correspondence with logo, recipient, subject, body,
  and signature block.

#### Compliance & Governance (lightweight scope)
- Filing-deadline tracker (CAC, DBIR) with overdue highlighting.
- Document Vault backed by Google Cloud Storage (not container-local
  storage, which is ephemeral) for licenses, permits, and certificates.
- Company Notices: admin-authored announcements visible to all staff.
- Deliberately excludes board resolutions, cap table, and a dedicated
  Secretary role - premature for a single-founder company with no board
  or shareholders yet; can be added when there's someone to build it for.

### v1.6.0 (August 8, 2026)

#### HR & Payroll, Phase 2
- Extended salary from a single figure into the standard Nigerian
  structure: Basic Salary + Housing/Transport/Utility/Meal allowances.
- Monthly Paystubs: Accountant/admin generates a per-month snapshot PDF
  (pdfkit) per employee; every staff member sees their own pay history on
  their profile page. Deductions are entered manually with a note, not
  auto-calculated - see [Payroll & Salary Access](#payroll--salary-access).
- Employee Handbook & Code of Conduct: versioned, admin-editable content
  with per-staff acknowledgment tracking (editing a document resets
  everyone's acknowledgment, so a real change requires re-reading it) and
  an HR/admin compliance view of who has and hasn't acknowledged.
- Contract generator: department-based templates (job title + description,
  seeded for all 7 departments) prefill a per-employee contract; generating
  one snapshots the employee's current salary structure into a branded PDF
  and emails it to them automatically.
- Internal Tickets system for IT Support and Development: any staff member
  can submit a request/task, IT Support and Development get queue access
  by default to triage priority/status/assignment and comment.

### v1.5.0 (August 8, 2026)

#### Critical Fixes
- Fixed the public booking-limiter and newsletter-limiter being mounted at
  the router level instead of on their specific public endpoints - this was
  rate-limiting admin staff out of the consultations list and newsletter
  subscriber list after a handful of page loads.
- Fixed the consultations "view" (eye icon) reading the wrong response
  field, which crashed on every click.
- Fixed a staff-permission edit bug: editing a staff member's permissions
  sent the update in a different shape than the API read, so changes
  silently failed to save.
- Fixed a critical mobile navigation bug: tapping a dropdown (Services/
  Company) closed the entire mobile menu instead of expanding the
  submenu, and the submenu had no CSS backing its JS-toggled state at all
  (it only appeared to work in prior testing due to simulated mouse hover).

#### HR & Payroll
- Two new roles: **HR** (staff records/onboarding) and **Accountant**
  (payroll), each with a dedicated permission flag and department preset.
- New Payroll dashboard (`admin/payroll.html`) with a separation-of-duties
  control: Accountants can view/process payroll but only Admin can change
  a salary figure (see [Payroll & Salary Access](#payroll--salary-access)).

#### Site Navigation & Content
- Added a "Company" nav dropdown (About, Meet the Team, Tech Stack,
  Careers) sitewide - Tech Stack and Careers were previously unreachable
  from the main navigation.
- New `team.html` page.
- Fixed the non-functional "Get in Touch" button on the careers page (was
  a bare `mailto:` link with no fallback).
- Added a read-only chat History tab to the admin Live Chats page.
- Redesigned the booking page with a 3-step progress indicator and real
  icons in place of leftover emoji.

#### Responsive / Cross-Device
- Full audit across desktop/tablet/phone on all 16 public pages and 10
  admin pages; fixed a systemic flexbox overflow (missing `min-width: 0`)
  that affected most of the admin dashboard on narrow screens, plus
  several page-specific table and grid overflow issues.

### v1.2.0 (January 5, 2026)

#### Security Enhancements
- JWT refresh tokens with 15-minute access / 7-day refresh
- Rate limiting on all endpoints
- Input sanitization and XSS protection
- Security headers (CSP, X-Frame-Options, etc.)
- Global error handler with sanitized responses

#### New Features
- Onboarding system with welcome modal and guided tour
- Empty states for all admin pages
- Search, filters, and pagination for data tables
- Saved replies with keyboard shortcuts
- Auto-save drafts for messages

#### Documentation
- Architecture diagrams
- API documentation
- Database schema documentation
- Security policy
- Backup and recovery plan

### v1.3.0 (January 2026)

#### Cookie Consent & Privacy
- GDPR/CCPA compliant cookie consent banner
- Cookie preference management (Analytics, Marketing, Functional)
- Persistent consent storage with 365-day expiry
- Cookie settings modal with toggle switches
- "Manage Cookie Preferences" button on Cookie Policy page
- Cookie consent notifications

#### UI Improvements
- Updated footer links across all pages
- Added Cookie Policy link to footer navigation

### v1.2.0 (January 2026)

- Legal pages (Privacy Policy, Terms of Service, Cookie Policy)
- Enhanced audit logging
- Staff performance tracking improvements

### v1.0.0 (January 2026)

- Initial release
- Public website with all service pages
- Admin dashboard with full CRUD
- Live chat with WebSocket
- Consultation booking system
- Staff management and RBAC
- Audit logging
- Settings management
- Data export functionality
- Staff performance tracking
- Notes and tags system

---

## License

Copyright © 2026 Tekvwa IT Solutions Ltd. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

---

## Support

For support, email **info@tekvwa.org** or open an issue in this repository.

---

<p align="center">
  <strong>Built with by Tekvwa IT Solutions Ltd</strong><br>
  <em>Transforming businesses through innovative technology solutions</em>
</p>
