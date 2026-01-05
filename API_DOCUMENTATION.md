# API Documentation

Complete API reference for Tekvwarho IT Solutions Ltd backend.

**Base URL:** `http://localhost:5500/api`

**Authentication:** Most endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Staff Management](#2-staff-management)
3. [Contact Messages](#3-contact-messages)
4. [Consultations](#4-consultations)
5. [Live Chat](#5-live-chat)
6. [Analytics](#6-analytics)
7. [Settings](#7-settings)
8. [Audit Logs](#8-audit-logs)
9. [Performance Metrics](#9-performance-metrics)
10. [Notes & Tags](#10-notes--tags)
11. [Data Export](#11-data-export)
12. [WebSocket Events](#12-websocket-events)

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev mode only)"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 1. Authentication

### Login

Authenticate a staff member and receive a JWT token.

```http
POST /api/admin/auth/login
```

**Request Body:**
```json
{
  "email": "admin@tekvwarho.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@tekvwarho.com",
      "name": "System Administrator",
      "role": "admin",
      "permissions": {
        "canManageMessages": true,
        "canManageConsultations": true,
        "canManageChats": true,
        "canViewAnalytics": true
      }
    },
    "mustChangePassword": false
  }
}
```

### Logout

Invalidate the current session.

```http
POST /api/admin/auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Change Password

Change the current user's password.

```http
POST /api/admin/auth/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Get Current User

Get the authenticated user's profile.

```http
GET /api/admin/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@tekvwarho.com",
    "name": "System Administrator",
    "role": "admin",
    "department": "IT",
    "phone": "+1234567890",
    "permissions": { ... }
  }
}
```

---

## 2. Staff Management

> **Required Role:** Admin only

### List All Staff

```http
GET /api/admin/staff
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "staff@tekvwarho.com",
      "name": "John Doe",
      "role": "staff",
      "department": "Sales",
      "phone": "+1234567890",
      "is_active": true,
      "must_change_password": false,
      "can_manage_messages": true,
      "can_manage_consultations": false,
      "can_manage_chats": true,
      "can_view_analytics": false,
      "last_login": "2026-01-05T10:30:00Z",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### Get Staff Member

```http
GET /api/admin/staff/:id
Authorization: Bearer <token>
```

### Create Staff Member

```http
POST /api/admin/staff
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "newstaff@tekvwarho.com",
  "password": "SecurePassword123!",
  "name": "Jane Smith",
  "role": "staff",
  "department": "Support",
  "phone": "+1234567890",
  "permissions": {
    "canManageMessages": true,
    "canManageConsultations": true,
    "canManageChats": true,
    "canViewAnalytics": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newstaff@tekvwarho.com",
    "name": "Jane Smith",
    "role": "staff"
  },
  "message": "Staff member created successfully"
}
```

### Update Staff Member

```http
PATCH /api/admin/staff/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "role": "manager",
  "department": "Sales",
  "permissions": {
    "canManageMessages": true,
    "canManageConsultations": true,
    "canManageChats": true,
    "canViewAnalytics": true
  }
}
```

### Delete Staff Member

```http
DELETE /api/admin/staff/:id
Authorization: Bearer <token>
```

### Activate Staff Member

```http
POST /api/admin/staff/:id/activate
Authorization: Bearer <token>
```

### Deactivate Staff Member

```http
POST /api/admin/staff/:id/deactivate
Authorization: Bearer <token>
```

### Reset Staff Password

```http
POST /api/admin/staff/:id/reset-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "newPassword": "NewSecurePassword123!"
}
```

---

## 3. Contact Messages

### List Messages

```http
GET /api/messages
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status: new, in_progress, converted, archived |
| assignedTo | uuid | Filter by assigned staff |
| startDate | date | Filter from date |
| endDate | date | Filter to date |
| limit | number | Results per page (default: 50) |
| offset | number | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Customer",
      "email": "john@example.com",
      "phone": "+1234567890",
      "company": "Acme Inc",
      "service": "software-development",
      "message": "I need help with...",
      "status": "new",
      "assigned_to": null,
      "assigned_staff_name": null,
      "created_at": "2026-01-05T10:00:00Z",
      "updated_at": "2026-01-05T10:00:00Z"
    }
  ]
}
```

### Get Message Details

```http
GET /api/messages/:id
Authorization: Bearer <token>
```

### Create Message (Public - No Auth)

```http
POST /api/messages
```

**Request Body:**
```json
{
  "name": "John Customer",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "service": "software-development",
  "message": "I would like to discuss a project..."
}
```

### Update Message Status

```http
PATCH /api/messages/:id/status
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "in_progress"
}
```

### Assign Message to Staff

```http
PATCH /api/messages/:id/assign
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "staffId": "uuid"
}
```

### Reply to Message

```http
POST /api/messages/:id/reply
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Thank you for contacting us...",
  "sendEmail": true
}
```

### Get Message Replies

```http
GET /api/messages/:id/replies
Authorization: Bearer <token>
```

---

## 4. Consultations

### List Consultations

```http
GET /api/consultations
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, confirmed, completed, cancelled |
| assignedTo | uuid | Filter by staff |
| startDate | date | From date |
| endDate | date | To date |
| limit | number | Results per page |
| offset | number | Pagination offset |

### Get Consultation Details

```http
GET /api/consultations/:id
Authorization: Bearer <token>
```

### Create Consultation (Public - No Auth)

```http
POST /api/consultations
```

**Request Body:**
```json
{
  "name": "John Customer",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "service": "it-consulting",
  "preferredDate": "2026-01-10",
  "preferredTime": "10:00",
  "timezone": "America/Toronto",
  "notes": "Looking forward to discussing..."
}
```

### Update Consultation Status

```http
PATCH /api/consultations/:id/status
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "confirmed"
}
```

### Reschedule Consultation

```http
PATCH /api/consultations/:id/reschedule
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "newDate": "2026-01-15",
  "newTime": "14:00",
  "notifyClient": true
}
```

### Assign Consultation

```http
PATCH /api/consultations/:id/assign
Authorization: Bearer <token>
```

### Get Available Slots

```http
GET /api/consultations/available-slots
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| date | date | Date to check |
| staffId | uuid | Optional: specific staff |

---

## 5. Live Chat

### List Chat Sessions

```http
GET /api/chats
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | active, closed |
| assignedTo | uuid | Filter by staff |

### Get Chat Session

```http
GET /api/chats/:sessionId
Authorization: Bearer <token>
```

### Get Chat Messages

```http
GET /api/chats/:sessionId/messages
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "sender": "visitor",
      "content": "Hello, I have a question...",
      "created_at": "2026-01-05T10:00:00Z"
    },
    {
      "id": "uuid",
      "session_id": "uuid",
      "sender": "staff",
      "staff_id": "uuid",
      "staff_name": "John Doe",
      "content": "Hi! How can I help you?",
      "created_at": "2026-01-05T10:01:00Z"
    }
  ]
}
```

### Send Chat Message

```http
POST /api/chats/:sessionId/messages
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "How can I help you today?"
}
```

### Close Chat Session

```http
POST /api/chats/:sessionId/close
Authorization: Bearer <token>
```

### Assign Chat to Staff

```http
PATCH /api/chats/:sessionId/assign
Authorization: Bearer <token>
```

---

## 6. Analytics

### Dashboard Statistics

```http
GET /api/analytics/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": {
      "total": 150,
      "new": 25,
      "inProgress": 45,
      "converted": 60,
      "archived": 20
    },
    "consultations": {
      "total": 80,
      "pending": 15,
      "confirmed": 20,
      "completed": 40,
      "cancelled": 5
    },
    "chats": {
      "total": 200,
      "active": 5,
      "avgDuration": "8m 30s"
    },
    "visitors": {
      "total": 1500,
      "unique": 1200,
      "withEmail": 300
    }
  }
}
```

### Messages Trend

```http
GET /api/analytics/messages/trend
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | day, week, month, year |
| startDate | date | Start date |
| endDate | date | End date |

### Consultations Trend

```http
GET /api/analytics/consultations/trend
Authorization: Bearer <token>
```

### Service Distribution

```http
GET /api/analytics/services
Authorization: Bearer <token>
```

### Top Performers

```http
GET /api/analytics/top-performers
Authorization: Bearer <token>
```

---

## 7. Settings

### Get All Settings

```http
GET /api/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "business": [
      { "setting_key": "business_name", "value": "Tekvwarho IT Solutions" },
      { "setting_key": "working_days", "value": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
      { "setting_key": "working_hours_start", "value": "09:00" },
      { "setting_key": "working_hours_end", "value": "17:00" }
    ],
    "notifications": [
      { "setting_key": "email_notifications", "value": true },
      { "setting_key": "new_message_alert", "value": true }
    ],
    "chat": [
      { "setting_key": "chat_enabled", "value": true },
      { "setting_key": "chat_greeting", "value": "Hello! How can we help?" }
    ]
  }
}
```

### Get Setting by Key

```http
GET /api/settings/:key
Authorization: Bearer <token>
```

### Update Setting

```http
PUT /api/settings/:key
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "value": "new-value"
}
```

### Bulk Update Settings

```http
POST /api/settings/bulk
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "settings": [
    { "key": "business_name", "value": "New Name" },
    { "key": "chat_enabled", "value": true }
  ]
}
```

---

## 8. Audit Logs

### List Audit Logs

```http
GET /api/audit
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| action | string | Filter by action type |
| entityType | string | message, consultation, chat, staff, settings |
| staffId | uuid | Filter by staff |
| startDate | date | From date |
| endDate | date | To date |
| limit | number | Results per page |
| offset | number | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "staff_id": "uuid",
      "staff_name": "John Doe",
      "action": "reply_sent",
      "entity_type": "message",
      "entity_id": "uuid",
      "details": { "content": "Reply text..." },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-01-05T10:00:00Z"
    }
  ]
}
```

### Get Audit Summary

Performance metrics grouped by staff.

```http
GET /api/audit/summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "staff_id": "uuid",
      "staff_name": "John Doe",
      "replies_sent": 45,
      "status_updates": 30,
      "assignments": 20,
      "total_actions": 95
    }
  ]
}
```

### Get Audit Log Detail

```http
GET /api/audit/:id
Authorization: Bearer <token>
```

---

## 9. Performance Metrics

### Get Staff Performance

```http
GET /api/performance/staff/:staffId
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | week, month, quarter, year |

**Response:**
```json
{
  "success": true,
  "data": {
    "staffId": "uuid",
    "staffName": "John Doe",
    "period": "month",
    "performanceScore": 85,
    "messages": {
      "assigned": 50,
      "converted": 35,
      "conversionRate": 70
    },
    "consultations": {
      "assigned": 30,
      "completed": 25,
      "completionRate": 83
    },
    "chats": {
      "sessionsHandled": 100,
      "messagesSent": 450
    },
    "responseTime": {
      "averageMinutes": 15,
      "averageFormatted": "15 min"
    },
    "activity": {
      "totalActions": 250,
      "activeDays": 22,
      "logins": 25,
      "replies": 120,
      "chatResponses": 80,
      "statusUpdates": 50
    }
  }
}
```

### Get My Performance

Get current user's own performance metrics.

```http
GET /api/performance/my-stats
Authorization: Bearer <token>
```

### Get Performance Summary

All staff summary (admin only).

```http
GET /api/performance/summary
Authorization: Bearer <token>
```

### Get Leaderboard

```http
GET /api/performance/leaderboard
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | week, month, quarter, year |
| limit | number | Number of results (default: 10) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "staffId": "uuid",
      "staffName": "Jane Smith",
      "role": "staff",
      "performanceScore": 92,
      "messagesConverted": 40,
      "consultationsCompleted": 28,
      "chatsHandled": 85
    }
  ]
}
```

---

## 10. Notes & Tags

### Notes

#### List Notes for Entity

```http
GET /api/notes/:entityType/:entityId
Authorization: Bearer <token>
```

**Path Parameters:**
- `entityType`: message, consultation, chat
- `entityId`: UUID of the entity

#### Add Note

```http
POST /api/notes/:entityType/:entityId
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Called customer, will follow up tomorrow"
}
```

#### Update Note

```http
PATCH /api/notes/:noteId
Authorization: Bearer <token>
```

#### Delete Note

```http
DELETE /api/notes/:noteId
Authorization: Bearer <token>
```

### Tags

#### List All Tags

```http
GET /api/tags
Authorization: Bearer <token>
```

#### Create Tag

```http
POST /api/tags
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "High Priority",
  "color": "#FF0000"
}
```

#### Add Tag to Entity

```http
POST /api/tags/:entityType/:entityId/tags
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "tagId": "uuid"
}
```

#### Remove Tag from Entity

```http
DELETE /api/tags/:entityType/:entityId/tags/:tagId
Authorization: Bearer <token>
```

#### Get Entity Tags

```http
GET /api/tags/:entityType/:entityId/tags
Authorization: Bearer <token>
```

---

## 11. Data Export

### Export Messages

```http
GET /api/export/messages
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| format | string | csv (default), json |
| startDate | date | From date |
| endDate | date | To date |
| status | string | Filter by status |

**Response:** CSV file download

### Export Consultations

```http
GET /api/export/consultations
Authorization: Bearer <token>
```

### Export Chats

```http
GET /api/export/chats
Authorization: Bearer <token>
```

### Generate Monthly Report

```http
GET /api/export/report
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "month": 1,
      "year": 2026
    },
    "summary": {
      "messages": { "total": 150, "new": 50, "converted": 60 },
      "consultations": { "total": 80, "completed": 65 },
      "chats": { "total": 200 },
      "visitors": { "total": 1500, "unique_with_email": 300 }
    },
    "topPerformers": [ ... ],
    "trends": { ... }
  }
}
```

---

## 12. WebSocket Events

### Connection

```javascript
const ws = new WebSocket('ws://localhost:5500/ws/chat');

ws.onopen = () => {
  // Register visitor
  ws.send(JSON.stringify({
    type: 'register',
    visitorId: 'unique-visitor-id',
    name: 'John',
    email: 'john@example.com'
  }));
};
```

### Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `register` | `{ visitorId, name, email }` | Register new visitor |
| `message` | `{ sessionId, content }` | Send message |
| `typing` | `{ sessionId }` | Typing indicator |
| `close` | `{ sessionId }` | Close session |

### Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `session_started` | `{ sessionId }` | New session created |
| `message` | `{ id, sender, content, timestamp }` | New message received |
| `typing` | `{ sender }` | Someone is typing |
| `session_closed` | `{ sessionId }` | Session ended |
| `staff_joined` | `{ staffName }` | Staff member joined chat |

### Staff WebSocket

```javascript
// Staff authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt-token-here'
}));

// Join session
ws.send(JSON.stringify({
  type: 'join',
  sessionId: 'session-uuid'
}));
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| AUTH_001 | Invalid credentials | Wrong email or password |
| AUTH_002 | Token expired | JWT token has expired |
| AUTH_003 | Insufficient permissions | User lacks required role/permission |
| VALID_001 | Validation error | Request body validation failed |
| VALID_002 | Missing required field | Required field not provided |
| DB_001 | Database error | Database operation failed |
| NOT_FOUND | Resource not found | Requested entity doesn't exist |

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Public (contact, booking) | 10 requests/minute |
| Authenticated | 100 requests/minute |
| File exports | 5 requests/minute |

---

## Changelog

### v1.0.0 (January 2026)
- Initial API release
- Full CRUD for messages, consultations, chats
- Staff management with RBAC
- Audit logging
- Performance metrics
- Data export

---

<p align="center">
  <strong>Tekvwarho IT Solutions Ltd API Documentation</strong><br>
  <em>Last updated: January 5, 2026</em>
</p>
