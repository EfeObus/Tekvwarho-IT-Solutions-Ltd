# Security Policy

## Tekvwarho IT Solutions Ltd - Security Implementation

> **Version:** 1.0  
> **Effective Date:** January 5, 2026  
> **Last Updated:** January 5, 2026

---

## 1. Authentication & Session Management

### 1.1 Token Strategy

| Token Type | Expiry | Storage | Purpose |
|------------|--------|---------|---------|
| Access Token (JWT) | 15 minutes | Memory/sessionStorage | API authentication |
| Refresh Token | 7 days | httpOnly cookie / secure storage | Token renewal |

### 1.2 Token Security Features

- **Token Rotation:** Refresh tokens are rotated on each use
- **Replay Protection:** 60-second grace period for old tokens
- **Token Binding:** Tokens linked to IP and User-Agent
- **Forced Invalidation:** All tokens invalidated on:
  - Password change
  - Role/permission change
  - Security incident
  - Manual logout from all devices

### 1.3 Session Controls

- Maximum concurrent sessions: Unlimited (each tracked)
- Session visibility: Users can view all active sessions
- Remote logout: Users can revoke any session
- Admin override: Admins can revoke all user sessions

---

## 2. Secrets Management

### 2.1 Secret Types

| Secret | Purpose | Rotation | Access |
|--------|---------|----------|--------|
| `JWT_SECRET` | Token signing | Quarterly | Server only |
| `DATABASE_URL` | DB connection | On compromise | Server only |
| `SMTP_PASS` | Email sending | Annually | Server only |

### 2.2 Rotation Schedule

| Secret Type | Rotation Frequency | Trigger Events |
|-------------|-------------------|----------------|
| JWT_SECRET | Every 90 days | Security incident, employee departure |
| Database credentials | Every 90 days | Security incident, DBA change |
| API keys | Annually | Integration change, key exposure |
| SMTP credentials | Annually | Email provider change |

### 2.3 Storage Rules

✅ **DO:**
- Use environment variables
- Use secret management services (in production)
- Encrypt at rest
- Audit access logs

❌ **DON'T:**
- Commit secrets to version control
- Log secrets
- Expose in error messages
- Share via insecure channels

---

## 3. Rate Limiting

### 3.1 Rate Limit Configuration

| Endpoint | Limit | Window | Penalty |
|----------|-------|--------|---------|
| `POST /api/admin/login` | 5 attempts | 15 min | Block |
| `POST /api/contact` | 3 submissions | 1 hour | Block |
| `POST /api/newsletter/subscribe` | 5 attempts | 1 hour | Block |
| `POST /api/consultation/book` | 3 bookings | 1 hour | Block |
| `POST /api/auth/refresh` | 30 requests | 15 min | Throttle |
| Authenticated API | 100 requests | 1 min | Throttle |
| Public API | 30 requests | 1 min | Block |

### 3.2 Response Headers

All rate-limited responses include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
Retry-After: 60 (on 429)
```

---

## 4. Input Validation & Sanitization

### 4.1 XSS Protection

- All user inputs sanitized using DOMPurify
- HTML stripped from text fields
- Safe subset allowed for rich text (b, i, em, strong, br, p, ul, ol, li)
- JavaScript URLs blocked

### 4.2 Field-Specific Validation

| Field Type | Validation |
|------------|------------|
| Email | Format validation, normalization |
| Phone | Digits only, max 20 chars |
| Name | No HTML, letters/spaces/hyphens only, max 100 chars |
| URL | Protocol validation, no javascript: or data: |
| Message | HTML stripped, max 5000 chars |

### 4.3 SQL Injection Prevention

- Parameterized queries only
- No dynamic SQL construction
- Input type validation

---

## 5. Security Headers

### 5.1 Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: https: blob:;
connect-src 'self' ws: wss: https:;
frame-ancestors 'self';
form-action 'self';
base-uri 'self';
object-src 'none';
```

### 5.2 Other Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | SAMEORIGIN | Clickjacking protection |
| X-XSS-Protection | 1; mode=block | Legacy XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer |
| Permissions-Policy | geolocation=(), microphone=(), camera=() | Disable features |

---

## 6. Bot Protection

### 6.1 Detection Methods

- User-Agent validation
- Request timing analysis
- Honeypot fields
- Rate limiting

### 6.2 Blocked Patterns

In production, the following are blocked on sensitive endpoints:
- Requests without User-Agent
- Known automation tools (curl, wget, etc.) on form endpoints
- Forms submitted too quickly (< 3 seconds)
- Honeypot field filled

---

## 7. Error Handling & Logging

### 7.1 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "requestId": "req_abc123xyz",
    "timestamp": "2026-01-05T10:30:00Z"
  }
}
```

### 7.2 Log Format

```json
{
  "timestamp": "2026-01-05T10:30:00.000Z",
  "level": "ERROR",
  "requestId": "req_abc123xyz",
  "userId": 5,
  "method": "POST",
  "path": "/api/contact",
  "statusCode": 400,
  "message": "Validation failed",
  "duration": "45ms",
  "ip": "192.168.1.1"
}
```

### 7.3 Information Disclosure Prevention

- Stack traces hidden in production
- Internal error details not exposed
- Generic error messages for 500 errors
- Request IDs for support correlation

---

## 8. Audit Logging

### 8.1 Events Logged

| Category | Events |
|----------|--------|
| Authentication | Login, logout, failed attempts, password changes |
| Data Access | View, create, update, delete operations |
| Admin Actions | Staff changes, settings updates, exports |
| Security | Token revocation, permission changes |

### 8.2 Log Retention

| Log Type | Retention Period |
|----------|------------------|
| Security events | 5 years |
| Admin actions | 3 years |
| Data access | 2 years |
| General logs | 90 days |

---

## 9. Incident Response

### 9.1 Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Active breach, data exposure | Immediate |
| High | Vulnerability discovered | 24 hours |
| Medium | Policy violation | 72 hours |
| Low | Best practice deviation | 1 week |

### 9.2 Response Steps

1. **Contain:** Isolate affected systems
2. **Assess:** Determine scope and impact
3. **Remediate:** Fix vulnerability, rotate secrets
4. **Notify:** Inform affected parties if required
5. **Document:** Post-incident report

---

## 10. Compliance

### 10.1 Standards

- PIPEDA (Canada)
- Industry best practices
- OWASP Top 10 mitigation

### 10.2 Data Protection

- Encryption in transit (HTTPS)
- Encryption at rest (database level)
- Access controls (RBAC)
- Audit trails

---

## Contact

**Security Concerns:** efe.obukohwo@outlook.com

---

*Last Updated: January 5, 2026*
