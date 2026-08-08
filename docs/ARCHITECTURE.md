# Tekvwa IT Solutions - Architecture Documentation

> **Version:** 1.0 
> **Last Updated:** January 5, 2026 
> **Status:** Production

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ CLIENT LAYER │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────────┐ │
│ │ Public Website │ │ Admin Dashboard │ │ Mobile/API Client │ │
│ │ (HTML/CSS/JS) │ │ (HTML/CSS/JS) │ │ (Future) │ │
│ │ │ │ │ │ │ │
│ │ • Homepage │ │ • Dashboard │ │ • REST API Client │ │
│ │ • Services │ │ • Messages │ │ • Push Notifications │ │
│ │ • Contact Form │ │ • Live Chats │ │ │ │
│ │ • Booking Form │ │ • Consultations │ │ │ │
│ │ • Live Chat │ │ • Staff Mgmt │ │ │ │
│ └────────────────────┘ └────────────────────┘ └────────────────────────┘ │
│ │
└────────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
                     ┌───────────────────┴───────────────────┐
                     │ HTTPS / WSS │
                     │ (Port 5500) │
                     └───────────────────┬───────────────────┘
                                         │
┌────────────────────────────────────────┴────────────────────────────────────────────┐
│ GATEWAY / TRANSPORT LAYER │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│ │ HTTP/HTTPS Server │ │ WebSocket Server │ │
│ │ (Express.js) │ │ (ws library) │ │
│ │ │ │ │ │
│ │ REST API Endpoints: │ │ Real-time Channels: │ │
│ │ • /api/admin/* │ │ • /ws/chat │ │
│ │ • /api/messages │ │ │ │
│ │ • /api/contact │ │ Events: │ │
│ │ • /api/newsletter │ │ • connection │ │
│ │ • /api/consultation │ │ • message │ │
│ │ • /api/auth/* │ │ • typing │ │
│ │ • /api/health │ │ • disconnect │ │
│ └─────────────────────────────────┘ └─────────────────────────────────────┘ │
│ │
└────────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┴────────────────────────────────────────────┐
│ MIDDLEWARE PIPELINE │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ │
│ Request Flow (Left to Right): │
│ │
│ ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────┐ │
│ │Security │ │ Body │ │ Rate │ │ Auth │ │ Request │ │
│ │Headers │──▶│ Parser │──▶│ Limiter │──▶│JWT Check │──▶│ ID/Logging │ │
│ │ CSP │ │ JSON │ │ Per-Route │ │ Validate │ │ Tracking │ │
│ └─────────┘ └──────────┘ └───────────┘ └──────────┘ └───────────────┘ │
│ │ │
│ ▼ │
│ ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────┐ │
│ │ CORS │ │Sanitizer │ │ Bot │ │ Honeypot │ │ Error │ │
│ │ Config │ │ XSS Prot │ │Protection │ │ Check │ │ Handler │ │
│ └─────────┘ └──────────┘ └───────────┘ └──────────┘ └───────────────┘ │
│ │
└────────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┴────────────────────────────────────────────┐
│ APPLICATION LAYER (Routes) │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ │
│ ┌────────────────────────────────────────────────────────────────────────────┐ │
│ │ Route Handlers │ │
│ ├────────────────────────────────────────────────────────────────────────────┤ │
│ │ │ │
│ │ /api/admin/auth Authentication (Login, Refresh, Logout) │ │
│ │ /api/admin/staff Staff CRUD, Roles, Permissions │ │
│ │ /api/admin/messages Message Management, Replies, Status │ │
│ │ /api/admin/chats Chat Sessions, History, Assignment │ │
│ │ /api/admin/consult Consultation Booking, Calendar, Status │ │
│ │ /api/admin/analytics Dashboard Stats, Reports, Exports │ │
│ │ /api/admin/audit Audit Logs, Activity History │ │
│ │ /api/admin/settings System Configuration │ │
│ │ │ │
│ │ /api/contact Public Contact Form Submission │ │
│ │ /api/newsletter Newsletter Subscription │ │
│ │ /api/consultation Public Booking Form │ │
│ │ /api/auth/* Token Refresh, Session Management │ │
│ │ │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ │
└────────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┴────────────────────────────────────────────┐
│ SERVICE LAYER │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ │ Token Manager │ │ Audit Service │ │ Email Service │ │
│ │ │ │ │ │ │ │
│ │ • JWT Access │ │ • Log Actions │ │ • Notifications │ │
│ │ • Refresh Token │ │ • User Activity │ │ • Confirmations │ │
│ │ • Rotation │ │ • Data Changes │ │ • Templates │ │
│ │ • Revocation │ │ • Login History │ │ • SMTP/Sendgrid │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│ │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ │ Performance Svc │ │ Session Svc │ │ Analytics Svc │ │
│ │ │ │ │ │ │ │
│ │ • Staff Metrics │ │ • Active Sess │ │ • Visitor Stats │ │
│ │ • Response Time │ │ • Device Track │ │ • Conversions │ │
│ │ • Workload │ │ • Multi-logout │ │ • Aggregations │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│ │
└────────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┴────────────────────────────────────────────┐
│ DATA ACCESS LAYER │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ │
│ ┌────────────────────────────────────────────────────────────────────────────┐ │
│ │ PostgreSQL Database │ │
│ │ tekvwa_it_solutions │ │
│ ├────────────────────────────────────────────────────────────────────────────┤ │
│ │ │ │
│ │ Core Tables: │ │
│ │ ┌────────────┐ ┌────────────┐ ┌────────────────┐ ┌───────────────────┐ │ │
│ │ │ staff │ │ messages │ │ consultations │ │ chat_sessions │ │ │
│ │ │ │ │ │ │ │ │ │ │ │
│ │ │ • id │ │ • id │ │ • id │ │ • session_id │ │ │
│ │ │ • name │ │ • name │ │ • name │ │ • visitor_id │ │ │
│ │ │ • email │ │ • email │ │ • email │ │ • staff_id │ │ │
│ │ │ • password │ │ • message │ │ • scheduled_at │ │ • status │ │ │
│ │ │ • role │ │ • status │ │ • topic │ │ • started_at │ │ │
│ │ └────────────┘ └────────────┘ └────────────────┘ └───────────────────┘ │ │
│ │ │ │
│ │ Security Tables: │ │
│ │ ┌────────────────┐ ┌─────────────────┐ ┌──────────────────────────────┐ │ │
│ │ │ refresh_tokens │ │ active_sessions │ │ audit_logs │ │ │
│ │ │ │ │ │ │ │ │ │
│ │ │ • token_hash │ │ • user_id │ │ • action │ │ │
│ │ │ • user_id │ │ • last_activity │ │ • entity_type │ │ │
│ │ │ • expires_at │ │ • is_active │ │ • entity_id │ │ │
│ │ │ • revoked_at │ │ • user_agent │ │ • changes (JSONB) │ │ │
│ │ └────────────────┘ └─────────────────┘ └──────────────────────────────┘ │ │
│ │ │ │
│ │ Supporting Tables: │ │
│ │ ┌────────────────┐ ┌─────────────────┐ ┌──────────────────────────────┐ │ │
│ │ │ chat_messages │ │ visitors │ │ page_views │ │ │
│ │ │ newsletter_sub │ │ settings │ │ notifications │ │ │
│ │ └────────────────┘ └─────────────────┘ └──────────────────────────────┘ │ │
│ │ │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION FLOW │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              LOGIN FLOW
    ┌──────────┐ ┌──────────┐
    │ Client │ │ Server │
    └────┬─────┘ └────┬─────┘
         │ │
         │ POST /api/admin/auth/login │
         │ { email, password } │
         │────────────────────────────────────────────────────────▶│
         │ │
         │ ┌────────────────────┤
         │ │ 1. Validate creds │
         │ │ 2. Check rate limit│
         │ │ 3. Hash comparison │
         │ │ 4. Generate tokens │
         │ │ 5. Store refresh │
         │ │ 6. Create session │
         │ │ 7. Log audit │
         │ └────────────────────┤
         │ │
         │ { accessToken, refreshToken, expiresIn } │
         │◀────────────────────────────────────────────────────────│
         │ │
         │ Store tokens: │
         │ • accessToken → memory/localStorage │
         │ • refreshToken → localStorage │
         │ │
    ┌────┴─────┐ ┌────┴─────┐
    │ Client │ │ Server │
    └──────────┘ └──────────┘


                           TOKEN REFRESH FLOW
    ┌──────────┐ ┌──────────┐
    │ Client │ │ Server │
    └────┬─────┘ └────┬─────┘
         │ │
         │ Timer: accessToken expires in 1 minute │
         │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
         │ │
         │ POST /api/auth/refresh │
         │ { refreshToken } │
         │────────────────────────────────────────────────────────▶│
         │ │
         │ ┌────────────────────┤
         │ │ 1. Validate token │
         │ │ 2. Check not revo │
         │ │ 3. Check expiry │
         │ │ 4. Generate new │
         │ │ 5. Rotate refresh │
         │ │ 6. Revoke old │
         │ └────────────────────┤
         │ │
         │ { accessToken, refreshToken, expiresIn } │
         │◀────────────────────────────────────────────────────────│
         │ │
         │ Update stored tokens │
         │ │
    ┌────┴─────┐ ┌────┴─────┐
    │ Client │ │ Server │
    └──────────┘ └──────────┘


                              API REQUEST FLOW
    ┌──────────┐ ┌──────────┐
    │ Client │ │ Server │
    └────┬─────┘ └────┬─────┘
         │ │
         │ GET /api/admin/messages │
         │ Authorization: Bearer <accessToken> │
         │────────────────────────────────────────────────────────▶│
         │ │
         │ ┌────────────────────┤
         │ │ Middleware Chain: │
         │ │ 1. Rate limit │
         │ │ 2. Parse JWT │
         │ │ 3. Verify sig │
         │ │ 4. Check version │
         │ │ 5. Load user │
         │ │ 6. Check perms │
         │ └────────────────────┤
         │ │
         │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
         │ 200 OK │
         │ or │
         │ 401 Unauthorized (token expired) │
         │ or │
         │ 403 Forbidden (no permission) │
         │ │
    ┌────┴─────┐ ┌────┴─────┐
    │ Client │ │ Server │
    └──────────┘ └──────────┘
```

---

## Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ REQUEST LIFECYCLE │
└─────────────────────────────────────────────────────────────────────────────────────┘

    Incoming Request
          │
          ▼
    ┌─────────────────┐
    │ Security │─────▶ Add CSP, X-Frame-Options, etc.
    │ Headers │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ CORS │─────▶ Check origin, set headers
    │ Validation │ (Block if not allowed)
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Request ID │─────▶ Generate: req_abc123xyz
    │ Generation │ Attach to request & response
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Body Parser │─────▶ Parse JSON body
    │ JSON │ Limit: 10kb
    └────────┬────────┘
             │ 
             ▼
    ┌─────────────────┐
    │ Rate Limiter │─────▶ Check: IP + Route limits
    │ Check │ Return 429 if exceeded
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Bot Protection │─────▶ Check: User-Agent, timing
    │ Check │ Block suspicious patterns
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Input │─────▶ Sanitize: XSS, SQL injection
    │ Sanitization │ Validate formats
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐ ┌──────────────────────┐
    │ Auth Check │─────▶ │ Public Route? │
    │ (if needed) │ │ ├─ Yes: Continue │
    └────────┬────────┘ │ └─ No: Check JWT │
             │ │ ├─ Valid: OK │
             │ │ └─ Invalid:401 │
             │ └──────────────────────┘
             ▼
    ┌─────────────────┐
    │ Route Handler │─────▶ Execute business logic
    │ (Controller) │ Query database
    └────────┬────────┘ Call services
             │
             ▼
    ┌─────────────────┐
    │ Response │─────▶ Format: { success, data }
    │ Formatting │ Add request ID
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Access │─────▶ Log: requestId, method, path
    │ Logging │ duration, status, user
    └────────┬────────┘
             │
             ▼
        Response Sent
```

---

## WebSocket Chat Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ WEBSOCKET CHAT ARCHITECTURE │
└─────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │ WebSocket Server │
    │ ws://localhost:5500/ws/chat │
    └─────────────────────────────────────────────────────────────────────────────┘
                        │ │
                        │ │
           ┌────────────┴───────────┐ ┌───────────┴────────────┐
           │ Visitor Clients │ │ Admin Clients │
           │ │ │ │
           │ • Connect on page load │ │ • Connect on chat page │
           │ • Send visitor_id │ │ • Send staff auth │
           │ • Receive messages │ │ • See all sessions │
           │ • Send messages │ │ • Claim sessions │
           └─────────────────────────┘ └─────────────────────────┘
                        │ │
                        └──────────────┬────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │ Connection Manager │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │ │
    │ Sessions Map: │
    │ ┌────────────────────────────────────────────────────────────────────────┐ │
    │ │ session_abc123: { │ │
    │ │ visitorConnection: WebSocket, │ │
    │ │ staffConnection: WebSocket | null, │ │
    │ │ visitorId: "v_12345", │ │
    │ │ staffId: 5 | null, │ │
    │ │ startedAt: "2026-01-05T10:00:00Z", │ │
    │ │ lastActivity: "2026-01-05T10:15:30Z", │ │
    │ │ status: "active" | "waiting" | "closed" │ │
    │ │ } │ │
    │ └────────────────────────────────────────────────────────────────────────┘ │
    │ │
    │ Staff Map: │
    │ ┌────────────────────────────────────────────────────────────────────────┐ │
    │ │ staff_5: { │ │
    │ │ connection: WebSocket, │ │
    │ │ activeSessions: ["session_abc123", "session_def456"], │ │
    │ │ available: true │ │
    │ │ } │ │
    │ └────────────────────────────────────────────────────────────────────────┘ │
    │ │
    └─────────────────────────────────────────────────────────────────────────────┘


                              MESSAGE FLOW

    ┌──────────┐ ┌─────────────┐ ┌──────────┐
    │ Visitor │ │ Server │ │ Staff │
    └────┬─────┘ └──────┬──────┘ └────┬─────┘
         │ │ │
         │ { type: 'message', │ │
         │ sessionId: 'abc123', │ │
         │ content: 'Hello!' } │ │
         │────────────────────────────────▶│ │
         │ │ │
         │ │──┐ 1. Validate session │
         │ │ │ 2. Store in DB │
         │ │ │ 3. Update last_activity │
         │ │◀─┘ │
         │ │ │
         │ │ { type: 'message', │
         │ │ sessionId: 'abc123', │
         │ │ from: 'visitor', │
         │ │ content: 'Hello!' } │
         │ │───────────────────────────────▶│
         │ │ │
         │ │ │
         │ │ { type: 'message', │
         │ │ sessionId: 'abc123', │
         │ │ content: 'Hi!' } │
         │ │◀───────────────────────────────│
         │ │ │
         │ { type: 'message', │ │
         │ sessionId: 'abc123', │ │
         │ from: 'staff', │ │
         │ staffName: 'John', │ │
         │ content: 'Hi!' } │ │
         │◀────────────────────────────────│ │
         │ │ │
    ┌────┴─────┐ ┌──────┴──────┐ ┌────┴─────┐
    │ Visitor │ │ Server │ │ Staff │
    └──────────┘ └─────────────┘ └──────────┘
```

---

## Database Schema (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ENTITY RELATIONSHIP DIAGRAM │
└─────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐ ┌─────────────────────┐
    │ staff │ │ refresh_tokens │
    ├─────────────────────┤ ├─────────────────────┤
    │ PK id │◀────────╮│ PK id │
    │ name │ ││ FK user_id │────────╮
    │ email (UNIQUE) │ ││ token_hash │ │
    │ password_hash │ ││ expires_at │ │
    │ role │ ││ revoked_at │ │
    │ permissions │ ││ replaced_by │────────┤
    │ token_version │ ││ user_agent │ │
    │ is_active │ ││ ip_address │ │
    │ created_at │ ││ created_at │ │
    │ last_login │ │└─────────────────────┘ │
    └─────────────────────┘ │ │
             │ │ │
             │ │ ┌─────────────────────┐ │
             │ │ │ active_sessions │ │
             │ │ ├─────────────────────┤ │
             │ ╰──│ PK id │ │
             │ │ FK user_id │─────╯
             │ │ FK refresh_token_id│
             │ │ last_activity │
             │ │ is_active │
             │ └─────────────────────┘
             │
             │
    ┌────────┴────────────────────────────────────────────────────────────────────┐
    │ Relations │
    └─────────────────────────────────────────────────────────────────────────────┘
             │
             ├──────────────────────┐
             │ │
             ▼ ▼
    ┌─────────────────────┐ ┌─────────────────────┐
    │ messages │ │ consultations │
    ├─────────────────────┤ ├─────────────────────┤
    │ PK id │ │ PK id │
    │ name │ │ name │
    │ email │ │ email │
    │ phone │ │ phone │
    │ service │ │ company │
    │ message │ │ topic │
    │ status │ │ scheduled_at │
    │ FK assigned_to │───│ duration │
    │ reply_content │ │ status │
    │ replied_at │ │ FK assigned_to │───┐
    │ created_at │ │ notes │ │
    │ ip_address │ │ created_at │ │
    └─────────────────────┘ └─────────────────────┘ │
                                                        │
             ┌──────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────┐ ┌─────────────────────┐
    │ chat_sessions │ │ chat_messages │
    ├─────────────────────┤ ├─────────────────────┤
    │ PK session_id │◀─────────│ PK id │
    │ visitor_id │ │ FK session_id │
    │ FK staff_id │──────────│ sender_type │
    │ visitor_name │ │ sender_id │
    │ visitor_email │ │ content │
    │ status │ │ created_at │
    │ started_at │ │ read_at │
    │ ended_at │ └─────────────────────┘
    │ rating │
    │ feedback │
    └─────────────────────┘


    ┌─────────────────────┐ ┌─────────────────────┐
    │ audit_logs │ │ newsletter_subs │
    ├─────────────────────┤ ├─────────────────────┤
    │ PK id │ │ PK id │
    │ FK user_id │ │ email (UNIQUE) │
    │ action │ │ name │
    │ entity_type │ │ status │
    │ entity_id │ │ subscribed_at │
    │ changes (JSONB) │ │ unsubscribed_at │
    │ ip_address │ │ ip_address │
    │ user_agent │ └─────────────────────┘
    │ created_at │
    └─────────────────────┘


    ┌─────────────────────┐ ┌─────────────────────┐
    │ visitors │ │ page_views │
    ├─────────────────────┤ ├─────────────────────┤
    │ PK visitor_id │◀─────────│ PK id │
    │ first_seen │ │ FK visitor_id │
    │ last_seen │ │ page_url │
    │ user_agent │ │ referrer │
    │ device_type │ │ time_on_page │
    │ country │ │ created_at │
    │ city │ └─────────────────────┘
    │ total_visits │
    └─────────────────────┘
```

---

## Data Flow Diagrams

### Contact Form Submission

```
    ┌──────────────────────────────────────────────────────────────────────────────┐
    │ CONTACT FORM DATA FLOW │
    └──────────────────────────────────────────────────────────────────────────────┘

    User Frontend Backend DB
     │ │ │ │
     │ Fill form │ │ │
     │ Click submit │ │ │
     │────────────────────────▶│ │ │
     │ │ │ │
     │ │ Validate locally │ │
     │ │ (email format, required) │ │
     │ │ │ │
     │ │ POST /api/contact │ │
     │ │ { name, email, phone, │ │
     │ │ service, message } │ │
     │ │──────────────────────────▶│ │
     │ │ │ │
     │ │ │ Rate limit check │
     │ │ │ Bot detection │
     │ │ │ Sanitize inputs │
     │ │ │ Validate format │
     │ │ │ │
     │ │ │ INSERT messages │
     │ │ │─────────────────────▶│
     │ │ │ │
     │ │ │ Send notification │
     │ │ │ email to admin │
     │ │ │ │
     │ │ │ Log audit entry │
     │ │ │─────────────────────▶│
     │ │ │ │
     │ │ { success: true, │ │
     │ │ message: 'Thanks!' } │ │
     │ │◀──────────────────────────│ │
     │ │ │ │
     │ Show success message │ │ │
     │ Reset form │ │ │
     │◀────────────────────────│ │ │
     │ │ │ │
```

---

## Deployment Architecture (Production)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ PRODUCTION DEPLOYMENT (Future) │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────────────┐
                              │ Cloudflare CDN │
                              │ • DDoS Protection │
                              │ • SSL Termination │
                              │ • Caching │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │ Load Balancer │
                              │ (AWS ALB / nginx) │
                              └──────────────┬──────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │ │ │
           ┌────────┴────────┐ ┌──────────┴──────────┐ ┌───────┴────────┐
           │ App Server 1 │ │ App Server 2 │ │ App Server 3 │
           │ (Node.js) │ │ (Node.js) │ │ (Node.js) │
           └────────┬────────┘ └──────────┬──────────┘ └───────┬────────┘
                    │ │ │
                    └────────────────────────┼────────────────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │ Redis Cluster │
                              │ • Session Store │
                              │ • Rate Limit Store │
                              │ • WebSocket Pub/Sub │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │ PostgreSQL (Primary) │
                              │ ┌───────────────┐ │
                              │ │ Replica │ │
                              │ │ (Standby) │ │
                              │ └───────────────┘ │
                              └─────────────────────────────┘
```

---

## Directory Structure

```
tekvwa-IT-solutions/
├── admin/ # Admin dashboard frontend
│ ├── css/
│ │ ├── admin.css # Main admin styles
│ │ └── onboarding.css # Onboarding & empty states
│ ├── js/
│ │ ├── admin.js # Main admin logic
│ │ └── onboarding.js # Onboarding system
│ ├── index.html # Dashboard
│ ├── messages.html # Messages management
│ ├── chats.html # Live chat console
│ ├── consultations.html # Bookings
│ ├── staff.html # Staff management
│ ├── analytics.html # Analytics & reports
│ ├── performance.html # Staff performance
│ ├── audit.html # Audit logs
│ ├── settings.html # System settings
│ └── login.html # Authentication
│
├── server/ # Backend API
│ ├── index.js # Entry point
│ ├── routes/
│ │ ├── admin.js # Admin API routes
│ │ ├── auth.js # Auth routes (refresh, logout)
│ │ └── ws-chat.js # WebSocket handler
│ ├── middleware/
│ │ ├── rateLimiter.js # Rate limiting
│ │ ├── sanitizer.js # XSS protection
│ │ ├── securityHeaders.js # CSP headers
│ │ └── errorHandler.js # Global error handling
│ └── services/
│ └── tokenManager.js # JWT management
│
├── database/
│ └── schema.sql # Database schema
│
├── docs/ # Documentation
│ └── ARCHITECTURE.md # This file
│
├── css/ # Public site styles
├── js/ # Public site scripts
├── img/ # Images
│
├── index.html # Homepage
├── services.html # Services page
├── contact.html # Contact form
├── book.html # Booking form
├── privacy-policy.html # Privacy policy
├── terms-of-service.html # Terms of service
├── cookie-policy.html # Cookie policy
│
├── ROADMAP.md # Implementation roadmap
├── SECURITY_POLICY.md # Security documentation
├── BACKUP_RECOVERY.md # DR procedures
│
├── package.json
└── .env.example
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 5, 2026 | Initial architecture documentation |

---

*This document is maintained alongside the codebase. For updates, contact the development team.*
