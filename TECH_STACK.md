# Technology Stack

> **Version:** 1.2  
> **Last Updated:** January 5, 2026

Tekvwarho IT Solutions leverages modern, secure, and scalable technologies to build high-performance digital solutions across web, data, and AI-driven systems.

---

## 📋 Table of Contents

- [Frontend Development](#frontend-development)
- [Backend & API Development](#backend--api-development)
- [Database & Data Management](#databases--data-management)
- [Security Implementation](#security-implementation)
- [Real-Time Communication](#real-time-communication)
- [AI, Machine Learning & Analytics](#ai-machine-learning--analytics)
- [Cloud & DevOps](#cloud--devops)
- [Payments & Integrations](#payments--integrations)
- [Reporting & Visualization](#reporting--visualization)

---

## Frontend Development

### Public Website

| Technology | Purpose | Version |
|------------|---------|---------|
| HTML5 | Semantic markup | - |
| CSS3 | Modern styling and animations | - |
| JavaScript (ES6+) | Core scripting language | ES2020+ |
| Responsive Design | Mobile-first approach | - |

### Admin Dashboard

| Technology | Purpose | Version |
|------------|---------|---------|
| HTML5/CSS3/JS | Dashboard interface | - |
| Custom Components | Modular JavaScript components | - |
| DataTable.js | Search, filters, pagination | 1.0 |
| SavedReplies.js | Quick response templates | 1.0 |
| Onboarding.js | First-time user onboarding | 1.0 |

### Future / Client Projects

| Technology | Purpose |
|------------|---------|
| React | Component-based UI development |
| TypeScript | Type-safe JavaScript development |
| Vite | Fast build tool and dev server |
| Tailwind CSS | Utility-first CSS framework |
| Material UI | React component library |

---

## Backend & API Development

### Core Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Server-side JavaScript runtime | 18+ |
| Express.js | Web application framework | 4.x |
| WebSocket (ws) | Real-time communication | 8.x |
| Nodemailer | Email sending | 6.x |

### API Architecture

| Feature | Implementation |
|---------|----------------|
| Architecture | RESTful API (60+ endpoints) |
| Authentication | JWT with access/refresh tokens |
| Authorization | Role-based access control (RBAC) |
| Validation | express-validator |
| Rate Limiting | express-rate-limit |
| Input Sanitization | DOMPurify, validator.js |

### Key npm Packages

| Package | Purpose |
|---------|---------|
| express | Web framework |
| jsonwebtoken | JWT token generation/verification |
| bcrypt | Password hashing |
| pg | PostgreSQL client |
| express-rate-limit | Rate limiting |
| dompurify | XSS protection |
| jsdom | DOM manipulation for sanitization |
| validator | Input validation |
| nodemailer | Email sending |
| ws | WebSocket support |

---

## Databases & Data Management

### Primary Database

| Technology | Purpose | Version |
|------------|---------|---------|
| PostgreSQL | Primary relational database | 14+ |
| pg (node-postgres) | PostgreSQL client | 8.x |

### Database Features

| Feature | Implementation |
|---------|----------------|
| Connection Pooling | pg Pool with max connections |
| Full-Text Search | GIN indexes, tsvector |
| Parameterized Queries | SQL injection prevention |
| Migrations | SQL migration files |
| UUID Primary Keys | gen_random_uuid() |

### Future / Client Projects

| Technology | Purpose |
|------------|---------|
| MySQL | Alternative relational database |
| Prisma ORM | Type-safe database client |
| Drizzle ORM | Lightweight TypeScript ORM |
| Redis | Caching and sessions |

---

## Security Implementation

### Authentication & Sessions

| Feature | Implementation |
|---------|----------------|
| Access Tokens | JWT, 15-minute expiry |
| Refresh Tokens | 7-day expiry, database-stored |
| Token Rotation | New refresh token on each use |
| Password Hashing | bcrypt with salt rounds |
| Session Management | Multiple device support |

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Contact Form | 3 submissions | 1 hour |
| Newsletter | 5 attempts | 1 hour |
| Chat Messages | 30 messages | 1 minute |
| API (authenticated) | 100 requests | 1 minute |
| API (public) | 30 requests | 1 minute |

### Security Headers

| Header | Value |
|--------|-------|
| Content-Security-Policy | Restrictive CSP |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | Disable geolocation, mic, camera |

### Input Protection

| Feature | Implementation |
|---------|----------------|
| XSS Protection | DOMPurify sanitization |
| SQL Injection | Parameterized queries |
| Input Validation | express-validator |
| HTML Escaping | Automatic in responses |

---

## Real-Time Communication

### WebSocket Implementation

| Feature | Implementation |
|---------|----------------|
| Library | ws (node WebSocket) |
| Protocol | WSS in production |
| Use Cases | Live chat, notifications |
| Connection Management | Custom chat handler |

### Chat Features

| Feature | Implementation |
|---------|----------------|
| Real-time Messages | WebSocket push |
| Typing Indicators | Debounced events |
| Read Receipts | Message status updates |
| Agent Assignment | Automatic/manual |

---

## AI, Machine Learning & Analytics

### Current Implementation

| Feature | Technology |
|---------|------------|
| Dashboard Analytics | Custom PostgreSQL queries |
| Performance Scoring | Weighted algorithm |
| Search | Full-text search with PostgreSQL |

### Future / Client Projects

| Technology | Purpose |
|------------|---------|
| Python | Primary ML/AI language |
| Pandas | Data manipulation and analysis |
| NumPy | Numerical computing |
| SciPy | Scientific computing |
| Scikit-learn | Machine learning library |
| XGBoost | Gradient boosting framework |
| AutoML | Automated machine learning |
| OpenAI API | GPT-4 / GPT-4 Turbo integration |
| Tableau | Advanced business intelligence |

---

## Cloud & DevOps

### Current Deployment

| Service | Purpose |
|---------|---------|
| Node.js Server | Application hosting |
| PostgreSQL | Database hosting |

### Future / Production

| Technology | Purpose |
|------------|---------|
| AWS EC2/RDS | Compute and database |
| Docker | Containerization |
| Nginx | Reverse proxy |
| PM2 | Process management |
| Let's Encrypt | SSL certificates |

### Recommended Stack

| Service | Purpose |
|---------|---------|
| AWS | Primary cloud provider |
| Heroku | Simple deployment option |
| DigitalOcean | Cost-effective hosting |
| Railway | Modern deployment platform |
| Vercel | Frontend-only hosting |

---

## Payments & Integrations

### Current Integrations

| Service | Purpose |
|---------|---------|
| SMTP (Gmail) | Email notifications |
| Nodemailer | Email sending |

### Future / Client Projects

| Service | Purpose |
|---------|---------|
| Paystack | Payment processing |
| Stripe | International payments |
| Third-party APIs | External service integration |
| Calendar APIs | Consultation scheduling |

---

## Reporting & Visualization

### Current Implementation

| Feature | Technology |
|---------|------------|
| Dashboard Charts | Custom JavaScript |
| Data Export | CSV generation |
| PDF Reports | Future implementation |

### Future / Client Projects

| Tool | Purpose |
|------|---------|
| PDF Generation | Automated report creation |
| DOCX Generation | Document automation |
| Data Dashboards | Interactive visualizations |
| Tableau | Advanced business intelligence |

---

## Technology Mapping to Services

### IT Consulting
**Technologies:** PostgreSQL, MySQL, AWS (RDS), JWT, RBAC, SHA-256, REST APIs, Docker

We help organizations make technology decisions that scale, reduce risk, and align with long-term business goals.

### Software Development
**Technologies:** Node.js, Express.js, Flask, Java, PostgreSQL, MySQL, Prisma, Drizzle, JDBC, Docker, WebSockets

Reliable, secure, and scalable software built for real-world usage.

### Website Development
**Technologies:** React, TypeScript, Vite, Tailwind CSS, Material UI, HTML5, CSS3, JavaScript

Modern websites that are fast, accessible, and conversion-focused.

### Data Analytics & AI Solutions
**Technologies:** Python, Pandas, NumPy, SciPy, Scikit-learn, XGBoost, AutoML, OpenAI API, Tableau

Data-driven decision-making backed by research-grade analytics and AI intelligence.

---

## Development Tools

### IDE & Editors

| Tool | Purpose |
|------|---------|
| VS Code | Primary development environment |
| Copilot | AI-assisted development |

### Version Control

| Tool | Purpose |
|------|---------|
| Git | Version control |
| GitHub | Repository hosting |

### Testing & Quality

| Tool | Purpose |
|------|---------|
| ESLint | JavaScript linting |
| Prettier | Code formatting |
| Postman | API testing |

---

## Industries We Serve

- Real Estate
- Healthcare
- Education
- Legal
- Finance
- Public Sector
- Startups & SMEs

---

## Package Dependencies

### Production Dependencies

```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "ws": "^8.14.2",
  "nodemailer": "^6.9.7",
  "express-rate-limit": "^7.1.5",
  "dompurify": "^3.0.6",
  "jsdom": "^23.0.1",
  "validator": "^13.11.0",
  "express-validator": "^7.0.1",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "helmet": "^7.1.0"
}
```

### Development Dependencies

```json
{
  "nodemon": "^3.0.2"
}
```
