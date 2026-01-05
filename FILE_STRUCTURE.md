# File Structure

Detailed breakdown of the Tekvwarho IT Solutions project structure.

## Root Directory

```
tekvwarho-it-solutions/
```

## Documentation Files

| File | Description |
|------|-------------|
| README.md | Main project documentation |
| TECH_STACK.md | Technology stack details |
| FILE_STRUCTURE.md | This file - structure overview |
| .env.example | Environment variables template |
| .gitignore | Git ignore rules |
| package.json | Node.js project configuration |
| package-lock.json | Dependency lock file |

## Public Directory (`/public`)

Frontend static files served to visitors.

### HTML Pages

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

### CSS (`/public/css`)

| File | Description |
|------|-------------|
| styles.css | Main stylesheet with all components |

### JavaScript (`/public/js`)

| File | Description |
|------|-------------|
| main.js | Core functionality (menu, forms, animations) |
| chat-widget.js | Live chat widget functionality |
| booking.js | Consultation booking system |

### Images (`/public/img`)

| File | Description |
|------|-------------|
| tekvwarho IT solutions logo.jpg | Company logo |

## Admin Directory (`/admin`)

Admin dashboard for staff and administrators.

### HTML Pages

| File | Purpose |
|------|---------|
| index.html | Dashboard overview with stats |
| login.html | Admin authentication |
| messages.html | Contact form submissions |
| chats.html | Live chat conversations |
| consultations.html | Consultation bookings |
| analytics.html | Site analytics |

### CSS (`/admin/css`)

| File | Description |
|------|-------------|
| admin.css | Admin dashboard styles |

### JavaScript (`/admin/js`)

| File | Description |
|------|-------------|
| admin.js | Dashboard functionality |

## Server Directory (`/server`)

Node.js backend application.

### Entry Point

| File | Description |
|------|-------------|
| index.js | Express server initialization |

### Configuration (`/server/config`)

| File | Description |
|------|-------------|
| database.js | PostgreSQL connection pool setup |

### Routes (`/server/routes`)

| File | Description |
|------|-------------|
| admin.js | Staff CRUD, authentication, password management |
| analytics.js | Dashboard statistics and trends |
| audit-export.js | Data export (CSV, PDF reports) |
| chat.js | Chat sessions and messages |
| consultation.js | Consultation bookings |
| contact.js | Contact form submissions |
| notes-tags.js | Notes and tags for lead management |
| performance.js | Staff performance metrics |
| settings.js | System settings CRUD |

### Middleware (`/server/middleware`)

| File | Purpose |
|------|---------|
| auth.js | JWT verification, role-based access control (RBAC) |

### Services (`/server/services`)

| File | Purpose |
|------|---------|
| auditService.js | Activity audit logging |
| emailService.js | Email notifications via SMTP |
| performanceService.js | Staff performance calculations |

### WebSocket (`/server/websocket`)

| File | Purpose |
|------|---------|
| chatHandler.js | Real-time chat WebSocket handler |

## Database Directory (`/database`)

Database schema and seed files.

| File | Purpose |
|------|---------|
| schema.sql | PostgreSQL table definitions (15+ tables) |
| seed.sql | Initial/sample data |

## Docs Directory (`/docs`)

Additional documentation.

| File | Purpose |
|------|---------|
| PROJECT_DOCUMENTATION.md | Detailed project specs |
| WIREFRAMES.md | Page layout wireframes |
| CONTENT_STRATEGY.md | Content and copy guide |

---

## Admin Pages (`/admin`)

| File | Purpose |
|------|---------|
| index.html | Dashboard with stats and quick actions |
| login.html | Staff authentication |
| messages.html | Contact message management |
| chats.html | Live chat conversations |
| consultations.html | Consultation bookings |
| analytics.html | Analytics and reports |
| staff.html | Staff management (admin only) |
| settings.html | System settings (admin only) |
| audit.html | Audit log viewer |
| performance.html | Staff performance tracking |

---

## API Endpoints Summary

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/messages | Submit contact form |
| POST | /api/consultations | Book consultation |
| GET | /api/consultations/available-slots | Get available slots |
| WS | /ws/chat | Real-time chat connection |

### Admin Endpoints (Authenticated)

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | /api/admin/auth/* | Login, logout, password |
| Staff | /api/admin/staff/* | Staff CRUD, permissions |
| Messages | /api/messages/* | Contact management |
| Chats | /api/chats/* | Chat sessions |
| Consultations | /api/consultations/* | Bookings |
| Analytics | /api/analytics/* | Statistics |
| Settings | /api/settings/* | Configuration |
| Audit | /api/audit/* | Activity logs |
| Performance | /api/performance/* | Staff metrics |
| Export | /api/export/* | Data export |
| Notes/Tags | /api/notes/*, /api/tags/* | Lead management |

