# Tekvwarho IT Solutions - Website Navigation Guide

This document provides a comprehensive overview of all website links and how to access different areas of the application.

## Table of Contents
- [Public Website](#public-website)
- [Admin Dashboard](#admin-dashboard)
- [Staff Dashboard](#staff-dashboard)
- [API Documentation](#api-documentation)

---

## Public Website

### Main Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/index.html` | Main landing page |
| About | `/about.html` | Company information |
| Portfolio | `/portfolio.html` | Project showcase |
| Blog | `/blog.html` | Tech insights and articles |
| Contact | `/contact.html` | Contact form |
| Book Consultation | `/book-consultation.html` | Schedule a consultation |

### Service Pages

| Page | URL | Description |
|------|-----|-------------|
| IT Consulting | `/it-consulting.html` | IT Consulting services |
| Software Development | `/software-development.html` | Custom software development |
| Website Development | `/website-development.html` | Web development services |
| Data Analytics | `/data-analytics.html` | Data analytics services |
| Tech Stack | `/tech-stack.html` | Technologies we use |

### Legal Pages

| Page | URL | Description |
|------|-----|-------------|
| Privacy Policy | `/privacy-policy.html` | Privacy information |
| Terms of Service | `/terms-of-service.html` | Terms and conditions |
| Cookie Policy | `/cookie-policy.html` | Cookie usage policy |

---

## Admin Dashboard

### Access URL
```
http://localhost:5500/admin/login.html
```

### Default Admin Credentials
- **Email:** `admin@tekvwarho.com`
- **Password:** `TekvwarhoAdmin2026!`

### Admin Pages

| Page | URL | Description | Access Level |
|------|-----|-------------|--------------|
| Login | `/admin/login.html` | Admin/Staff login | Public |
| Dashboard | `/admin/index.html` | Main dashboard with overview | All Staff |
| Messages | `/admin/messages.html` | Contact form submissions | Staff with permission |
| Live Chats | `/admin/chats.html` | Real-time chat management | Staff with permission |
| Consultations | `/admin/consultations.html` | Consultation bookings | Staff with permission |
| Analytics | `/admin/analytics.html` | Website analytics | Staff with permission |
| Performance | `/admin/performance.html` | Server performance metrics | Admin/Manager |
| Audit Logs | `/admin/audit.html` | Activity and security logs | Admin only |
| Staff Management | `/admin/staff.html` | Manage staff members | Admin only |
| Settings | `/admin/settings.html` | System settings | Admin only |

### Admin Features

#### Dashboard (`/admin/index.html`)
- Overview statistics (messages, chats, consultations)
- Recent activity feed
- Quick action buttons

#### Messages (`/admin/messages.html`)
- View and respond to contact form submissions
- Mark as read/unread, archive, delete
- Filter by status

#### Live Chats (`/admin/chats.html`)
- Real-time chat with website visitors
- Claim/release chat sessions
- Transfer chats to other staff
- View chat history

#### Consultations (`/admin/consultations.html`)
- View consultation booking requests
- Approve/decline/schedule consultations
- Export consultation data

#### Analytics (`/admin/analytics.html`)
- Page views and visitor tracking
- Traffic sources and trends
- Geographic data
- Custom date range filters

#### Staff Management (`/admin/staff.html`)
- Add new staff members
- Edit staff profiles
- Set permissions (Messages, Consultations, Chats, Analytics)
- Activate/deactivate accounts
- Reset passwords

---

## Staff Dashboard

### Access URL
```
http://localhost:5500/users/index.html
```

### Staff Pages

| Page | URL | Description |
|------|-----|-------------|
| Login | `/users/index.html` | Staff login page |
| Dashboard | `/users/dashboard.html` | Staff personal dashboard |
| My Chats | `/users/my-chats.html` | Personal chat assignments |

### Staff Capabilities
Staff members can:
- Access features based on their assigned permissions
- Update their profile
- Change their password
- Manage assigned chats and messages

---

## API Documentation

### Base URL
```
http://localhost:5500/api
```

### API Documentation File
Full API documentation is available at:
```
/docs/API_DOCUMENTATION.md
```

### Key API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Staff/Admin login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/admin/change-password` | Change password |

#### Public APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Submit contact form |
| POST | `/api/newsletter/subscribe` | Subscribe to newsletter |
| POST | `/api/consultation` | Book a consultation |
| POST | `/api/analytics/track` | Track page views |

#### Admin APIs (Requires Authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard statistics |
| GET | `/api/admin/messages` | List messages |
| GET | `/api/admin/staff` | List staff members |
| GET | `/api/consultations` | List consultations |
| GET | `/api/analytics` | Analytics data |

### WebSocket Connection
```
ws://localhost:5500/ws/chat
```

Query Parameters:
- `type=visitor` - For website visitors
- `type=admin` - For admin/staff members
- `session=<sessionId>` - To rejoin existing session

---

## Quick Start Guide

### For Administrators

1. **Login**: Navigate to `http://localhost:5500/admin/login.html`
2. **Use credentials**: `admin@tekvwarho.com` / `TekvwarhoAdmin2026!`
3. **First-time setup**: Change your password when prompted
4. **Add staff**: Go to Staff Management to add team members

### For Staff Members

1. **Get credentials**: Admin will create your account
2. **Login**: Navigate to `http://localhost:5500/users/index.html`
3. **Change password**: Update your temporary password
4. **Start working**: Access permitted areas based on your role

### For Developers

1. **Start the server**: `node server/index.js`
2. **Default port**: 5500
3. **Database**: PostgreSQL (see `/server/config/database.js`)
4. **API docs**: See `/docs/API_DOCUMENTATION.md`

---

## Environment Configuration

### Development
```
Server: http://localhost:5500
WebSocket: ws://localhost:5500/ws/chat
```

### Production
Update the following for production deployment:
- Database connection string
- JWT secrets in environment variables
- CORS origins
- Cookie domain settings

---

## Troubleshooting

### Cannot access admin dashboard
1. Ensure server is running: `node server/index.js`
2. Check database connection
3. Verify admin user exists in database
4. Clear browser cache and cookies

### Chat not connecting
1. Check WebSocket server is running
2. Verify correct WebSocket URL
3. Check browser console for errors
4. Ensure authentication token is valid

### Staff cannot see certain pages
1. Verify staff has required permissions
2. Check role assignment (admin, manager, staff)
3. Ensure account is active

---

## Security Notes

- Always change default admin password immediately
- Use strong passwords (minimum 8 characters)
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- All sensitive operations are logged in audit trail
