# Tekvwarho IT Solutions Ltd - Security & Feature Roadmap

> **Document Version:** 1.0  
> **Created:** January 5, 2026  
> **Status:** Active Implementation  
> **Priority:** Critical gaps first, then enhancements

---

## 📋 Executive Summary

This roadmap addresses identified gaps in security, operational resilience, product maturity, and business compliance. Implementation follows a phased approach prioritizing security and compliance first.

---

## 🎯 Implementation Phases

| Phase | Focus Area | Timeline | Status |
|-------|------------|----------|--------|
| **Phase 1** | Security & Compliance | Week 1-2 | 🔄 In Progress |
| **Phase 2** | Operational Resilience | Week 3-4 | ⏳ Pending |
| **Phase 3** | Product & UX Maturity | Week 5-6 | ⏳ Pending |
| **Phase 4** | Business & Legal | Week 7 | ⏳ Pending |
| **Phase 5** | Documentation & Diagrams | Week 8 | ⏳ Pending |

---

## 🔴 Phase 1: Security & Compliance (CRITICAL)

### 1.1 Refresh Tokens & Session Management

**Current State:** JWT access tokens only (long-lived, no rotation)

**Target State:**
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Token rotation on refresh
- Forced logout on role/permission change
- Session revocation capability

**Implementation:**

```
Files to Create/Modify:
├── server/middleware/tokenManager.js    # Token generation & validation
├── server/routes/auth.js                # Refresh endpoint
├── database/schema.sql                  # refresh_tokens table
├── admin/js/admin.js                    # Auto-refresh logic
└── server/services/sessionService.js    # Session management
```

**Database Changes:**
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    replaced_by UUID REFERENCES refresh_tokens(id),
    user_agent TEXT,
    ip_address INET
);

CREATE TABLE active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    refresh_token_id UUID REFERENCES refresh_tokens(id),
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/refresh` | POST | Exchange refresh token for new access token |
| `/api/auth/logout` | POST | Revoke current session |
| `/api/auth/logout-all` | POST | Revoke all user sessions |
| `/api/auth/sessions` | GET | List active sessions |
| `/api/auth/sessions/:id` | DELETE | Revoke specific session |

**Security Policies:**
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Token rotation: New refresh token on each use
- Old token grace period: 60 seconds (replay protection)
- Force re-login on: password change, role change, permission change

---

### 1.2 Rate Limiting & Abuse Protection

**Current State:** No rate limiting

**Target State:**
- Per-route rate limits
- IP-based throttling
- Progressive delays on failed attempts
- Bot detection basics

**Implementation:**

```
Files to Create/Modify:
├── server/middleware/rateLimiter.js     # Rate limiting logic
├── server/middleware/botProtection.js   # Basic bot detection
└── server/config/rateLimits.js          # Rate limit configurations
```

**Rate Limit Configurations:**
| Route | Limit | Window | Penalty |
|-------|-------|--------|---------|
| `POST /api/admin/auth/login` | 5 attempts | 15 minutes | Progressive delay |
| `POST /api/contact` | 3 submissions | 1 hour | Block |
| `POST /api/newsletter/subscribe` | 5 attempts | 1 hour | Block |
| `WS /ws/chat` | 30 messages | 1 minute | Throttle |
| `POST /api/consultation/book` | 3 bookings | 1 hour | Block |
| `GET /api/*` (authenticated) | 100 requests | 1 minute | Throttle |
| `GET /api/*` (public) | 30 requests | 1 minute | Block |

**Bot Protection:**
- Honeypot fields in forms
- Request timing analysis
- User-Agent validation
- Referrer checking
- CAPTCHA trigger on suspicious activity

**Headers to Add:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
Retry-After: 60 (on 429)
```

---

### 1.3 Input Sanitization & XSS Protection

**Current State:** SQL injection prevention only

**Target State:**
- XSS sanitization on all user inputs
- HTML escaping in responses
- Content Security Policy headers
- File upload validation (future-ready)

**Implementation:**

```
Files to Create/Modify:
├── server/middleware/sanitizer.js       # Input sanitization
├── server/middleware/securityHeaders.js # Security headers
├── server/utils/htmlEscape.js           # HTML escaping utilities
└── server/config/csp.js                 # Content Security Policy
```

**Sanitization Rules:**
| Field Type | Sanitization |
|------------|--------------|
| Names | Strip HTML, limit length (100) |
| Email | Validate format, lowercase |
| Phone | Digits only, format validation |
| Messages/Content | Sanitize HTML, allow safe markdown |
| URLs | Validate format, block javascript: |
| File names | Strip special chars, validate extension |

**Security Headers:**
```javascript
{
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}
```

**Dependencies:**
```json
{
  "xss": "^1.0.14",
  "dompurify": "^3.0.6",
  "jsdom": "^23.0.1",
  "helmet": "^7.1.0",
  "validator": "^13.11.0"
}
```

---

### 1.4 Secrets & Key Rotation Policy

**Current State:** Env vars documented, no rotation policy

**Target State:**
- Documented rotation schedule
- Per-environment secrets
- Access restrictions documented
- Secure storage guidelines

**Policy Document:**

```markdown
## Secrets Management Policy

### Rotation Schedule
| Secret | Rotation Frequency | Trigger Events |
|--------|-------------------|----------------|
| JWT_SECRET | Quarterly | Security incident |
| DATABASE_PASSWORD | Quarterly | Staff departure |
| SMTP_PASS | Annually | Credential compromise |
| API_KEYS (external) | Annually | Integration change |

### Environment Separation
| Environment | Secret Source | Access |
|-------------|---------------|--------|
| Development | .env.development | Developers |
| Staging | Environment vars | DevOps |
| Production | Vault/Secret Manager | Limited (2 admins) |

### Access Restrictions
- Production secrets: Only CTO and Lead Developer
- Rotation authority: CTO only
- Emergency access: Documented break-glass procedure

### Storage Rules
- ❌ Never commit secrets to version control
- ❌ Never log secrets
- ❌ Never expose in error messages
- ✅ Use environment variables
- ✅ Encrypt at rest
- ✅ Audit access logs
```

---

## 🔵 Phase 2: Operational Resilience

### 2.1 Error Handling & Observability

**Current State:** Basic try/catch, console logging

**Target State:**
- Global error handler middleware
- Structured JSON logging
- Request/trace IDs
- Error categorization
- Log levels (debug, info, warn, error)

**Implementation:**

```
Files to Create/Modify:
├── server/middleware/errorHandler.js    # Global error handler
├── server/middleware/requestId.js       # Request ID generation
├── server/utils/logger.js               # Structured logger
├── server/utils/AppError.js             # Custom error classes
└── server/config/logging.js             # Log configuration
```

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "requestId": "req_abc123xyz",
    "timestamp": "2026-01-05T10:30:00Z"
  }
}
```

**Log Format:**
```json
{
  "timestamp": "2026-01-05T10:30:00.000Z",
  "level": "error",
  "requestId": "req_abc123xyz",
  "userId": 5,
  "method": "POST",
  "path": "/api/contact",
  "statusCode": 400,
  "message": "Validation failed",
  "error": { "field": "email", "reason": "invalid_format" },
  "duration": 45,
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

**Error Categories:**
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `AUTHENTICATION_ERROR` | 401 | Not authenticated |
| `AUTHORIZATION_ERROR` | 403 | Not authorized |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | External service down |

---

### 2.2 Background Jobs & Queue System

**Current State:** Synchronous email sending, exports block requests

**Target State:**
- Async job queue for emails
- Async export generation
- Retry logic with exponential backoff
- Job status tracking
- Failure recovery

**Implementation:**

```
Files to Create/Modify:
├── server/jobs/queue.js                 # Job queue manager
├── server/jobs/workers/emailWorker.js   # Email job processor
├── server/jobs/workers/exportWorker.js  # Export job processor
├── server/jobs/workers/performanceWorker.js # Performance calc
├── database/schema.sql                  # job_queue table
└── server/routes/jobs.js                # Job status API
```

**Database Schema:**
```sql
CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_status ON job_queue(status, scheduled_for);
```

**Job Types:**
| Type | Priority | Max Attempts | Timeout |
|------|----------|--------------|---------|
| `email.notification` | 7 | 3 | 30s |
| `email.welcome` | 5 | 3 | 30s |
| `export.csv` | 3 | 2 | 5m |
| `export.pdf` | 3 | 2 | 5m |
| `performance.calculate` | 2 | 1 | 10m |
| `cleanup.sessions` | 1 | 1 | 5m |

**Retry Strategy:**
```javascript
// Exponential backoff
retryDelay = baseDelay * Math.pow(2, attemptNumber);
// 1st: 5s, 2nd: 10s, 3rd: 20s
```

---

### 2.3 Backup & Disaster Recovery

**Current State:** "Configure backup strategy" mentioned, no specifics

**Target State:**
- Documented backup schedule
- Retention policy
- Recovery procedures
- Regular restore testing

**Backup Policy:**

```markdown
## Backup & Disaster Recovery Policy

### Backup Schedule
| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full Database | Daily 2:00 AM | 30 days | Off-site S3 |
| Transaction Logs | Every 15 min | 7 days | Local + S3 |
| Configuration | On change | 90 days | Git + S3 |
| Uploads/Media | Daily | 30 days | S3 |

### Recovery Objectives
| Metric | Target | Current |
|--------|--------|---------|
| RPO (Recovery Point Objective) | 15 minutes | - |
| RTO (Recovery Time Objective) | 1 hour | - |

### Recovery Procedures
1. **Database Recovery**
   - Identify failure point
   - Select appropriate backup
   - Restore to staging first
   - Verify data integrity
   - Switch production

2. **Application Recovery**
   - Deploy from last known good commit
   - Verify environment variables
   - Run health checks

### Testing Schedule
| Test Type | Frequency | Last Test | Next Test |
|-----------|-----------|-----------|-----------|
| Backup Verification | Weekly | - | - |
| Restore Test | Monthly | - | - |
| Full DR Drill | Quarterly | - | - |

### Runbook Location
- Primary: /docs/runbooks/disaster-recovery.md
- Backup: Confluence/Wiki
- Emergency: Printed copy in office
```

---

## 🟢 Phase 3: Product & UX Maturity

### 3.1 Onboarding & Empty States

**Current State:** No guidance for new users

**Target State:**
- First admin login walkthrough
- Empty state messages with CTAs
- Getting started checklist
- Contextual help tooltips

**Implementation:**

```
Files to Create/Modify:
├── admin/js/onboarding.js               # Onboarding logic
├── admin/css/onboarding.css             # Onboarding styles
├── admin/partials/empty-states.html     # Empty state templates
└── database/schema.sql                  # onboarding_progress table
```

**Empty States to Create:**

| Page | Empty State Message | CTA |
|------|---------------------|-----|
| Messages | "No messages yet. Share your contact page to start receiving inquiries!" | Copy Contact URL |
| Chats | "No chat conversations yet. The chat widget is active on your website." | Preview Chat Widget |
| Consultations | "No consultations booked. Share your booking page!" | Copy Booking URL |
| Staff | "You're the only team member. Add staff to help manage inquiries." | Add Staff Member |
| Analytics | "Start collecting data. Analytics will appear after visitor activity." | View Website |

**Onboarding Checklist:**
```javascript
const onboardingSteps = [
  { id: 'profile', label: 'Complete your profile', completed: false },
  { id: 'business_hours', label: 'Set business hours', completed: false },
  { id: 'email_templates', label: 'Customize email templates', completed: false },
  { id: 'first_staff', label: 'Add a team member', completed: false },
  { id: 'test_chat', label: 'Test the live chat widget', completed: false },
  { id: 'first_booking', label: 'Receive first booking', completed: false }
];
```

---

### 3.2 Search, Filters & Pagination

**Current State:** Basic listing, no explicit search/filter/pagination

**Target State:**
- Full-text search across entities
- Date range filters
- Status filters
- Sortable columns
- Cursor-based pagination
- Saved filter presets

**Implementation:**

```
Files to Create/Modify:
├── server/utils/queryBuilder.js         # Dynamic query building
├── server/middleware/pagination.js      # Pagination middleware
├── admin/js/components/search.js        # Search component
├── admin/js/components/filters.js       # Filter component
└── admin/js/components/pagination.js    # Pagination component
```

**Search Endpoints:**
```
GET /api/messages?search=john&status=new&from=2026-01-01&to=2026-01-31&sort=-created_at&page=1&limit=20
GET /api/consultations?search=cloud&status=confirmed&sort=scheduled_at&page=1&limit=20
GET /api/chats?search=urgent&assigned=5&sort=-last_message&page=1&limit=20
```

**Response Format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "search": "john",
    "status": "new",
    "dateRange": { "from": "2026-01-01", "to": "2026-01-31" }
  }
}
```

**Database Indexes:**
```sql
CREATE INDEX idx_messages_search ON messages USING gin(to_tsvector('english', name || ' ' || email || ' ' || message));
CREATE INDEX idx_consultations_search ON consultations USING gin(to_tsvector('english', name || ' ' || email || ' ' || topic));
CREATE INDEX idx_messages_status_created ON messages(status, created_at DESC);
```

---

### 3.3 Drafts & Saved Replies

**Current State:** No draft saving, no templates

**Target State:**
- Auto-save drafts while typing
- Saved reply templates
- Template variables
- Quick insert shortcuts

**Implementation:**

```
Files to Create/Modify:
├── server/routes/templates.js           # Template CRUD
├── database/schema.sql                  # reply_templates, drafts tables
├── admin/js/components/drafts.js        # Draft auto-save
└── admin/js/components/templates.js     # Template picker
```

**Database Schema:**
```sql
CREATE TABLE reply_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drafts (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    staff_id INTEGER REFERENCES staff(id),
    content TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, entity_id, staff_id)
);
```

**Template Variables:**
```
{{customer_name}} - Customer's name
{{company_name}} - Your company name
{{staff_name}} - Staff member's name
{{booking_date}} - Consultation date
{{booking_time}} - Consultation time
{{service_name}} - Service type
```

**Default Templates:**
| Name | Category | Use Case |
|------|----------|----------|
| Acknowledgment | Messages | Initial response to inquiry |
| Booking Confirmation | Consultations | Confirm booking |
| Follow-up | Messages | 3-day follow-up |
| Meeting Link | Consultations | Send meeting details |
| Thank You | General | Post-meeting thanks |

---

## 🟡 Phase 4: Business & Legal Completeness

### 4.1 Legal Pages

**Current State:** No legal pages

**Target State:**
- Privacy Policy (PIPEDA compliant)
- Terms of Service
- Cookie Policy
- Accessible footer links

**Pages to Create:**
```
├── privacy-policy.html     # Privacy Policy
├── terms-of-service.html   # Terms of Service
└── cookie-policy.html      # Cookie Policy
```

**Privacy Policy Sections:**
1. Information We Collect
2. How We Use Your Information
3. Information Sharing
4. Data Retention
5. Your Rights (PIPEDA)
6. Cookies and Tracking
7. Security Measures
8. Contact Information
9. Policy Updates

**PIPEDA Requirements:**
- [ ] Consent for data collection
- [ ] Purpose limitation
- [ ] Access rights
- [ ] Correction rights
- [ ] Complaint process

---

### 4.2 Data Retention & Deletion Policy

**Current State:** Logs everything, no retention limits

**Target State:**
- Defined retention periods
- User deletion request handling
- Admin purge controls
- Compliance documentation

**Retention Schedule:**
| Data Type | Retention | Deletion Method |
|-----------|-----------|-----------------|
| Messages | 2 years | Archive then delete |
| Chat logs | 1 year | Soft delete |
| Consultations | 3 years | Archive |
| Audit logs | 5 years | Archive to cold storage |
| Analytics | 2 years | Aggregate then delete |
| Sessions | 30 days | Hard delete |

**User Rights API:**
```
POST /api/data/export-request    # Request data export
POST /api/data/deletion-request  # Request data deletion
GET /api/admin/data/requests     # Admin: view requests
POST /api/admin/data/process/:id # Admin: process request
```

---

### 4.3 Accessibility (A11y)

**Current State:** Not addressed

**Target State:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

**Audit Checklist:**
- [ ] All images have alt text
- [ ] Form labels are associated
- [ ] Color contrast meets 4.5:1 ratio
- [ ] Focus visible on all interactive elements
- [ ] Skip navigation link
- [ ] Heading hierarchy is correct
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] No content relies solely on color

**Implementation:**
```
Files to Create/Modify:
├── css/accessibility.css        # A11y specific styles
├── js/accessibility.js          # A11y helpers
└── All HTML files               # Add ARIA, fix semantics
```

---

## 🟣 Phase 5: Documentation & Diagrams

### 5.1 Architecture Diagram

**Create:** `docs/diagrams/architecture.md`

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Public Site  │  │Admin Dashboard│  │   Mobile/API Client │   │
│  │  (HTML/JS)   │  │  (HTML/JS)   │  │      (Future)        │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TRANSPORT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐       ┌──────────────────────┐        │
│  │   HTTP/HTTPS:5500    │       │   WebSocket:5500     │        │
│  │   REST API           │       │   /ws/chat           │        │
│  └──────────────────────┘       └──────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐     │
│  │                 Express.js Server                       │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  Middleware Pipeline:                                   │     │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │     │
│  │  │ CORS    │→│BodyParser│→│ RateLimiter│→│ Auth/JWT  │   │     │
│  │  └─────────┘ └──────────┘ └──────────┘ └───────────┘   │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  Route Handlers:                                        │     │
│  │  /api/admin  /api/messages  /api/chats  /api/consult   │     │
│  │  /api/analytics  /api/settings  /api/audit             │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │ Audit      │ │ Email      │ │ Performance│ │ Session    │    │
│  │ Service    │ │ Service    │ │ Service    │ │ Service    │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐     │
│  │              PostgreSQL Database                        │     │
│  │  ┌──────┐ ┌────────┐ ┌─────────────┐ ┌───────────┐     │     │
│  │  │staff │ │messages│ │consultations│ │chat_sessions│    │     │
│  │  └──────┘ └────────┘ └─────────────┘ └───────────┘     │     │
│  │  ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐       │     │
│  │  │audit_logs│ │settings│ │visitors│ │job_queue │       │     │
│  │  └──────────┘ └────────┘ └────────┘ └──────────┘       │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Request Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    REQUEST LIFECYCLE                              │
└──────────────────────────────────────────────────────────────────┘

Client Request
     │
     ▼
┌──────────────────┐
│  Rate Limiter    │──── 429 Too Many Requests
│  Check IP/Route  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Request ID      │──── Generate: req_abc123xyz
│  Generation      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Body Parser     │──── 400 Invalid JSON
│  JSON Validation │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Input Sanitizer │──── Sanitize XSS/HTML
│  XSS Prevention  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Auth Middleware │──── 401 Unauthorized
│  JWT Validation  │──── 403 Forbidden
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Route Handler   │──── Business Logic
│  Controller      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Database Query  │──── 500 DB Error
│  PostgreSQL      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Audit Logger    │──── Log Action
│  Record Action   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Response        │──── 200/201 Success
│  Formatter       │
└────────┬─────────┘
         │
         ▼
     Response
```

### 5.3 WebSocket Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                  WEBSOCKET CHAT LIFECYCLE                         │
└──────────────────────────────────────────────────────────────────┘

Visitor Opens Chat Widget
         │
         ▼
┌────────────────────┐
│ Connect WebSocket  │
│ ws://host/ws/chat  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Server: Generate   │
│ Session ID         │
│ (visitor_xxxxx)    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Server: Send       │──────────────────────┐
│ { type: 'connected'│                      │
│   sessionId: '...' }                      │
└─────────┬──────────┘                      │
          │                                  │
          │◄────────────────────────────────┘
          ▼
┌────────────────────┐
│ Visitor: Send Msg  │
│ { type: 'message', │
│   content: 'Hi' }  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Server: Store in   │
│ chat_messages      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Server: Broadcast  │────► Admin Dashboard
│ to Admin WebSocket │      (Real-time update)
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Admin: Reply       │────► Server
│ { type: 'message', │
│   sessionId: '...' │
│   content: '...' } │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Server: Route to   │────► Visitor Widget
│ Visitor Session    │      (Shows message)
└────────────────────┘
```

### 5.4 RBAC Matrix

```
┌──────────────────────────────────────────────────────────────────────┐
│                        RBAC PERMISSION MATRIX                         │
├────────────────────┬──────────┬──────────┬──────────┬────────────────┤
│ Permission         │  Admin   │ Manager  │  Staff   │ Custom Role    │
├────────────────────┼──────────┼──────────┼──────────┼────────────────┤
│ View Dashboard     │    ✅    │    ✅    │    ✅    │ If assigned    │
│ Manage Messages    │    ✅    │    ✅    │    ⚙️    │ can_manage_msg │
│ Manage Chats       │    ✅    │    ✅    │    ⚙️    │ can_manage_chat│
│ Manage Consults    │    ✅    │    ✅    │    ⚙️    │ can_manage_cons│
│ View Analytics     │    ✅    │    ✅    │    ⚙️    │ can_view_anlytc│
│ Manage Staff       │    ✅    │    ❌    │    ❌    │ Admin only     │
│ Manage Settings    │    ✅    │    ❌    │    ❌    │ Admin only     │
│ View Audit Logs    │    ✅    │    ✅    │    ❌    │ Admin/Manager  │
│ Export Data        │    ✅    │    ✅    │    ❌    │ Admin/Manager  │
│ Performance View   │    ✅    │    ✅    │   Own    │ Admin/Manager  │
├────────────────────┴──────────┴──────────┴──────────┴────────────────┤
│ ✅ = Full Access   ⚙️ = If permission granted   ❌ = No Access       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Progress Tracking

### Phase 1 Progress
- [ ] 1.1 Refresh Tokens & Session Management
- [ ] 1.2 Rate Limiting & Abuse Protection
- [ ] 1.3 Input Sanitization & XSS Protection
- [ ] 1.4 Secrets & Key Rotation Policy

### Phase 2 Progress
- [ ] 2.1 Error Handling & Observability
- [ ] 2.2 Background Jobs & Queue System
- [ ] 2.3 Backup & Disaster Recovery

### Phase 3 Progress
- [ ] 3.1 Onboarding & Empty States
- [ ] 3.2 Search, Filters & Pagination
- [ ] 3.3 Drafts & Saved Replies

### Phase 4 Progress
- [ ] 4.1 Legal Pages
- [ ] 4.2 Data Retention & Deletion Policy
- [ ] 4.3 Accessibility (A11y)

### Phase 5 Progress
- [ ] 5.1 Architecture Diagram
- [ ] 5.2 Request Lifecycle Diagram
- [ ] 5.3 WebSocket Lifecycle Diagram
- [ ] 5.4 RBAC Matrix

---

## 📅 Timeline

```
Week 1-2: Phase 1 (Security)
├── Day 1-2: Refresh tokens
├── Day 3-4: Rate limiting
├── Day 5-6: XSS protection
└── Day 7: Secrets policy

Week 3-4: Phase 2 (Operations)
├── Day 1-3: Error handling
├── Day 4-6: Job queue
└── Day 7: Backup policy

Week 5-6: Phase 3 (Product)
├── Day 1-2: Onboarding
├── Day 3-5: Search/pagination
└── Day 6-7: Templates/drafts

Week 7: Phase 4 (Legal)
├── Day 1-2: Legal pages
├── Day 3-4: Retention policy
└── Day 5-7: Accessibility

Week 8: Phase 5 (Documentation)
├── Day 1-3: Diagrams
└── Day 4-7: Review & polish
```

---

## ✅ Definition of Done

Each feature is complete when:

1. **Code Complete** - Implementation finished
2. **Tests Pass** - Unit and integration tests pass
3. **Documentation** - API docs and README updated
4. **Security Review** - Security checklist passed
5. **Code Review** - Peer review approved
6. **Deployed** - Successfully deployed to staging
7. **Verified** - QA verification passed

---

## 📞 Contacts

| Role | Name | Responsibility |
|------|------|----------------|
| Project Lead | Efe Obukohwo | Overall delivery |
| Security | TBD | Security review |
| QA | TBD | Testing |

---

*Last Updated: January 5, 2026*
