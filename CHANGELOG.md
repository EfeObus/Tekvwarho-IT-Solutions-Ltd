# Changelog

All notable changes to the Tekvwa IT Solutions project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- User portal pages (my-messages, my-consultations, my-chats, profile)
- Database seed script for development/testing
- SEO essentials (robots.txt, sitemap.xml, manifest.json)
- Custom 404 error page
- Docker and Docker Compose configuration
- ESLint and Prettier configuration files
- DATABASE_URL connection string support for hosted PostgreSQL providers
- SSL configuration for production database connections
- This CHANGELOG file

### Fixed
- Server path resolution for HTML files
- Duplicate RETURN statement in database schema trigger function

### Changed
- Updated database configuration to support hosted-provider DATABASE_URL
- Enhanced database initialization for cloud environments
- Updated seed script for hosted PostgreSQL compatibility

---

## [1.4.0] - 2026-08-08

### Changed
- Rebranded from Tekvwarho IT Solutions to Tekvwa IT Solutions across the entire site, admin dashboard, and documentation
- Migrated hosting from Railway to Google Cloud (Cloud Run + Cloud SQL + global HTTPS load balancer), live at tekvwa.org
- Replaced all Canada office/phone references with Nigeria-only contact details (company is not yet incorporated in Canada)
- Rewrote Privacy Policy's rights section and Terms of Service's governing-law clause for Nigeria (NDPA/NDPR) instead of Canada (PIPEDA)
- Replaced decorative emoji across the app UI and documentation with Font Awesome icons
- Resolved all 21 known npm dependency vulnerabilities, including a major-version upgrade of `nodemailer`

### Fixed
- Contact form, consultation, live chat, and newsletter-subscriber API routes had no authentication in production — any of these could be read or modified by an unauthenticated request
- Live chat WebSocket accepted an unverified staff identity from the client, allowing admin impersonation
- Removed a hardcoded JWT signing-key fallback and an unauthenticated debug endpoint
- `database/init.js` now applies migrations, not just the base schema
- Fixed logo/favicon references that pointed to a deleted image file
- Added the missing Font Awesome stylesheet to 8 admin pages that referenced `fa-*` icon classes without loading the icon font

### Removed
- Railway deployment configuration (`railway.json`) — no longer in use

---

## [1.3.0] - 2026-01-05

### Added
- Saved replies feature with keyboard shortcuts
- Auto-save drafts for messages and replies
- Search, filters, and pagination components
- Staff performance tracking and leaderboards
- API documentation (60+ endpoints)
- Database schema documentation
- Architecture diagrams

### Changed
- Updated README with comprehensive feature documentation
- Enhanced security policy documentation

---

## [1.2.0] - 2026-01-05

### Added
- JWT refresh tokens with rotation
- Session management and revocation
- Rate limiting on all endpoints
- Input sanitization and XSS protection
- Security headers (CSP, HSTS, X-Frame-Options)
- Global error handler with structured responses
- Audit logging system
- Legal pages (Privacy Policy, Terms of Service, Cookie Policy)
- Onboarding flow for first-time admin users
- Backup and recovery documentation

### Security
- Token version tracking for forced invalidation
- IP and User-Agent binding for tokens
- Bot protection middleware
- Honeypot fields for form submissions

---

## [1.1.0] - 2026-01-04

### Added
- Admin dashboard with real-time statistics
- Staff management with roles and permissions
- Message management system
- Live chat functionality (WebSocket)
- Consultation booking system
- Analytics dashboard
- Settings management
- Notes and tags for lead management
- Email notification system

### Changed
- Migrated to PostgreSQL database
- Enhanced responsive design

---

## [1.0.0] - 2026-01-03

### Added
- Initial website release
- Homepage with service overview
- Service pages (IT Consulting, Software Development, Website Development, Data Analytics)
- Tech stack showcase page
- Portfolio page
- About page
- Contact form
- Blog page
- Cookie consent banner
- Responsive navigation

### Technical
- Express.js backend server
- PostgreSQL database
- WebSocket support
- Mobile-first responsive design

---

## Version History Summary

| Version | Date | Major Changes |
|---------|------|---------------|
| 1.3.0 | 2026-01-05 | Saved replies, drafts, search/pagination, performance tracking |
| 1.2.0 | 2026-01-05 | Security hardening, rate limiting, audit logging |
| 1.1.0 | 2026-01-04 | Admin dashboard, chat, booking, staff management |
| 1.0.0 | 2026-01-03 | Initial release |

---

## Migration Notes

### Upgrading from 1.2.x to 1.3.0
1. Run database migration: `database/migrations/003_saved_replies_drafts.sql`
2. Update npm dependencies: `npm install`
3. Restart the server

### Upgrading from 1.1.x to 1.2.0
1. Add new environment variables: `JWT_SECRET`, rate limit settings
2. Run database schema updates for refresh_tokens and active_sessions tables
3. Update admin frontend to handle token refresh

---

[Unreleased]: https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd/releases/tag/v1.0.0
