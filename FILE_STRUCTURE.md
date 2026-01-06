# File Structure

> **Version:** 1.2  
> **Last Updated:** January 5, 2026

Detailed breakdown of the Tekvwarho IT Solutions project structure.

---

## Root Directory

```
tekvwarho-it-solutions/
├── 📄 README.md                    # Main project documentation
├── 📄 ROADMAP.md                   # Security & Feature Roadmap
├── 📄 SECURITY_POLICY.md           # Security policies and procedures
├── 📄 BACKUP_RECOVERY.md           # Backup and disaster recovery plan
├── 📄 TECH_STACK.md                # Technology stack documentation
├── 📄 FILE_STRUCTURE.md            # This file - structure overview
├── 📄 API_DOCUMENTATION.md         # API reference (duplicate in /docs)
├── 📄 package.json                 # Node.js project configuration
├── 📄 package-lock.json            # Dependency lock file
├── 📄 .env.example                 # Environment variables template
├── 📄 .env                         # Local environment variables (not in git)
├── 📄 .gitignore                   # Git ignore rules
│
├── 📂 admin/                       # Admin dashboard frontend
├── 📂 server/                      # Backend Node.js application
├── 📂 database/                    # Database schema and migrations
├── 📂 docs/                        # Additional documentation
├── 📂 css/                         # Public website styles
├── 📂 js/                          # Public website JavaScript
├── 📂 img/                         # Images and assets
├── 📂 users/                       # User uploads/data
└── 📂 node_modules/                # npm dependencies (not in git)
```

---

## Documentation Files

| File | Description |
|------|-------------|
| README.md | Main project documentation with quick start |
| ROADMAP.md | Feature roadmap with implementation status |
| SECURITY_POLICY.md | Security policies, incident response |
| BACKUP_RECOVERY.md | Backup procedures and disaster recovery |
| TECH_STACK.md | Technology stack details |
| FILE_STRUCTURE.md | This file - complete structure overview |
| .env.example | Environment variables template |

---

## Public HTML Pages

| File | Purpose |
|------|---------|
| index.html | Homepage with hero, services, testimonials |
| about.html | Company story, team, mission |
| contact.html | Contact form and information |
| portfolio.html | Project showcase |
| blog.html | Blog articles listing |
| it-consulting.html | IT Consulting service details |
| software-development.html | Software Development service |
| website-development.html | Website Development service |
| data-analytics.html | Data Analytics service |
| tech-stack.html | Technology stack showcase |
| book-consultation.html | Consultation booking page |
| privacy-policy.html | Privacy Policy (GDPR/PIPEDA compliant) |
| terms-of-service.html | Terms of Service |
| cookie-policy.html | Cookie Policy |

---

## CSS Directory (`/css`)

| File | Description |
|------|-------------|
| styles.css | Main public website stylesheet |

---

## JavaScript Directory (`/js`)

| File | Description |
|------|-------------|
| main.js | Core functionality (menu, forms, animations) |
| chat-widget.js | Live chat widget functionality |
| booking.js | Consultation booking system |
| cookie-consent.js | GDPR/CCPA cookie consent manager |
| tracking.js | Analytics and visitor tracking |

---

## Admin Directory (`/admin`)

Admin dashboard for staff and administrators.

### Admin HTML Pages

| File | Purpose |
|------|---------|
| index.html | Dashboard overview with stats, onboarding |
| login.html | Admin authentication |
| messages.html | Contact form submissions management |
| chats.html | Live chat conversations |
| consultations.html | Consultation bookings |
| analytics.html | Site analytics and reports |
| staff.html | Staff management (admin only) |
| settings.html | System settings (admin only) |
| audit.html | Audit log viewer |
| performance.html | Staff performance tracking |

### Admin CSS (`/admin/css`)

| File | Description |
|------|-------------|
| admin.css | Core admin dashboard styles |
| onboarding.css | Onboarding modals, empty states, tour |
| dataTable.css | Search, filters, pagination, table styles |
| savedReplies.css | Saved replies manager styles |

### Admin JavaScript (`/admin/js`)

| File | Description |
|------|-------------|
| admin.js | Core dashboard functionality (1500+ lines) |
| onboarding.js | Onboarding system with welcome modal |

### Admin Components (`/admin/js/components`)

| File | Description |
|------|-------------|
| dataTable.js | Search, filters, pagination components |
| savedReplies.js | Saved replies manager with shortcuts |

---

## Server Directory (`/server`)

Node.js backend application.

### Entry Point

| File | Description |
|------|-------------|
| index.js | Express server initialization (port 5500) |

### Configuration (`/server/config`)

| File | Description |
|------|-------------|
| database.js | PostgreSQL connection pool setup |

### Models (`/server/models`)

| File | Description |
|------|-------------|
| Staff.js | Staff model with authentication methods |
| Message.js | Message/contact form model |
| Chat.js | Chat sessions and messages model |
| Consultation.js | Consultation bookings model |
| Visitor.js | Visitor tracking model |
| SavedReply.js | Saved reply templates model |
| Draft.js | Auto-saved drafts model |

### Routes (`/server/routes`)

| File | Description |
|------|-------------|
| admin.js | Staff CRUD, authentication, password management |
| auth.js | Token refresh, session management |
| analytics.js | Dashboard statistics and trends |
| audit-export.js | Data export (CSV, PDF reports) |
| chat.js | Chat sessions and messages |
| consultation.js | Consultation bookings |
| contact.js | Contact form submissions (public) |
| messages.js | Messages with search, filters, pagination |
| newsletter.js | Newsletter subscription |
| notes-tags.js | Notes and tags for lead management |
| performance.js | Staff performance metrics |
| savedReplies.js | Saved replies CRUD |
| settings.js | System settings CRUD |

### Middleware (`/server/middleware`)

| File | Purpose |
|------|---------|
| auth.js | JWT verification, RBAC authorization |
| rateLimiter.js | Rate limiting per route |
| sanitizer.js | Input sanitization, XSS protection |
| securityHeaders.js | CSP, X-Frame-Options, etc. |
| errorHandler.js | Global error handler |
| pagination.js | Pagination middleware |

### Services (`/server/services`)

| File | Purpose |
|------|---------|
| auditService.js | Activity audit logging |
| emailService.js | Email notifications via SMTP |
| performanceService.js | Staff performance calculations |
| tokenManager.js | JWT access/refresh token management |

### Utilities (`/server/utils`)

| File | Purpose |
|------|---------|
| queryBuilder.js | Dynamic SQL query builder with search/filters |

### WebSocket (`/server/websocket`)

| File | Purpose |
|------|---------|
| chatHandler.js | Real-time chat WebSocket handler |

---

## Database Directory (`/database`)

Database schema and migration files.

| File | Purpose |
|------|---------|
| schema.sql | PostgreSQL table definitions (20+ tables) |
| init.js | Database initialization script |

### Migrations (`/database/migrations`)

| File | Purpose |
|------|---------|
| 003_saved_replies_drafts.sql | Saved replies, drafts tables, search indexes |

---

## Docs Directory (`/docs`)

Additional documentation files.

| File | Purpose |
|------|---------|
| ARCHITECTURE.md | System architecture diagrams |
| API_DOCUMENTATION.md | Complete REST API reference |
| DATABASE_SCHEMA.md | ERD and table documentation |
| PROJECT_DOCUMENTATION.md | Detailed project specs |
| WIREFRAMES.md | Page layout wireframes |
| CONTENT_STRATEGY.md | Content and copy guide |

---

## API Endpoints Summary

See [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for complete API reference.

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/contact | Submit contact form |
| POST | /api/newsletter/subscribe | Newsletter subscription |
| POST | /api/consultation/book | Book consultation |
| GET | /api/consultation/available-slots | Get available slots |
| WS | /ws/chat | Real-time chat connection |

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/login | Staff login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout current session |
| POST | /api/auth/logout-all | Logout all sessions |
| GET | /api/auth/sessions | List active sessions |
| DELETE | /api/auth/sessions/:id | Revoke specific session |

### Admin Endpoints (Authenticated)

| Module | Base Path | Description |
|--------|-----------|-------------|
| Staff | /api/admin/staff/* | Staff CRUD, permissions |
| Messages | /api/messages/* | Contact management with search |
| Chats | /api/chats/* | Chat sessions |
| Consultations | /api/consultations/* | Bookings |
| Analytics | /api/analytics/* | Statistics |
| Settings | /api/settings/* | Configuration |
| Audit | /api/audit/* | Activity logs |
| Performance | /api/performance/* | Staff metrics |
| Export | /api/export/* | Data export |
| Notes/Tags | /api/notes/*, /api/tags/* | Lead management |
| Saved Replies | /api/saved-replies/* | Quick response templates |
| Drafts | /api/drafts/* | Auto-saved drafts |

---

## Database Tables

### Core Tables

| Table | Description |
|-------|-------------|
| staff | Admin users with roles and permissions |
| messages | Contact form submissions |
| message_replies | Replies to messages |
| consultations | Consultation bookings |
| chat_sessions | Live chat sessions |
| chat_messages | Individual chat messages |
| visitors | Visitor tracking |

### Security Tables

| Table | Description |
|-------|-------------|
| refresh_tokens | JWT refresh tokens |
| active_sessions | Active user sessions |
| audit_logs | Activity audit trail |

### Feature Tables

| Table | Description |
|-------|-------------|
| settings | System configuration key-value |
| notes | Notes attached to leads |
| tags | Tags for categorization |
| entity_tags | Tag assignments (many-to-many) |
| saved_replies | Quick response templates |
| drafts | Auto-saved message drafts |
| newsletter_subscriptions | Newsletter subscribers |

---

## Environment Variables

See `.env.example` for complete list:

```env
# Server
PORT=5500
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tekvwarho_IT_solutions

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@tekvwarho.com

# Admin
ADMIN_EMAIL=admin@tekvwarho.com
ADMIN_PASSWORD=your-secure-password
```

---

## Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server (nodemon)
npm run db:init    # Initialize database
npm run db:seed    # Seed sample data
npm test           # Run tests
```

