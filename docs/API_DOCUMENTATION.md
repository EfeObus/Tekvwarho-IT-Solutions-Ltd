# Tekvwarho IT Solutions - API Documentation

> **Version:** 1.0  
> **Base URL:** `http://localhost:5500/api` (Development)  
> **Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Contact/Messages](#contactmessages)
3. [Admin Messages](#admin-messages)
4. [Consultations](#consultations)
5. [Chats](#chats)
6. [Staff Management](#staff-management)
7. [Saved Replies](#saved-replies)
8. [Drafts](#drafts)
9. [Analytics](#analytics)
10. [System Settings](#system-settings)

---

## Authentication

All admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Login

```
POST /api/admin/login
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
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "expiresIn": 900,
    "refreshExpiresAt": "2026-01-12T10:30:00Z",
    "mustChangePassword": false,
    "user": {
        "id": "uuid",
        "email": "admin@tekvwarho.com",
        "name": "Admin User",
        "role": "admin",
        "department": "IT",
        "can_manage_messages": true,
        "can_manage_consultations": true,
        "can_manage_chats": true,
        "can_view_analytics": true
    }
}
```

### Refresh Token

```
POST /api/auth/refresh
```

**Request Body:**
```json
{
    "refreshToken": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"
}
```

**Response:**
```json
{
    "success": true,
    "accessToken": "new-jwt-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 900
}
```

### Logout

```
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

### Logout All Sessions

```
POST /api/auth/logout-all
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
    "success": true,
    "message": "All sessions revoked",
    "revokedCount": 3
}
```

---

## Contact/Messages

### Submit Contact Form (Public)

```
POST /api/contact
```

**Request Body:**
```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "service": "web-development",
    "message": "I'm interested in your services..."
}
```

**Response:**
```json
{
    "success": true,
    "message": "Thank you for your message. We'll get back to you soon!",
    "id": "message-uuid"
}
```

---

## Admin Messages

### List Messages

```
GET /api/admin/messages
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sort` | string | Sort field with direction (e.g., `-created_at`) |
| `search` | string | Search across name, email, company, message |
| `status` | string | Filter by status (new, in_progress, converted, archived) |
| `service` | string | Filter by service type |
| `assigned_to` | uuid | Filter by assigned staff |
| `from` | date | Start date (YYYY-MM-DD) |
| `to` | date | End date (YYYY-MM-DD) |

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "name": "John Doe",
            "email": "john@example.com",
            "company": "Acme Corp",
            "service": "web-development",
            "message": "...",
            "status": "new",
            "assigned_to": null,
            "created_at": "2026-01-05T10:30:00Z",
            "updated_at": "2026-01-05T10:30:00Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "totalPages": 8,
        "hasNextPage": true,
        "hasPrevPage": false,
        "from": 1,
        "to": 20
    }
}
```

### Get Message Statistics

```
GET /api/admin/messages/stats
```

**Response:**
```json
{
    "success": true,
    "data": {
        "total": 150,
        "new_count": 25,
        "in_progress_count": 30,
        "converted_count": 85,
        "archived_count": 10,
        "unassigned_count": 15,
        "today_count": 5,
        "week_count": 42
    }
}
```

### Get Single Message

```
GET /api/admin/messages/:id
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "message": "...",
        "replies": [
            {
                "id": "uuid",
                "staff_id": "uuid",
                "content": "Thank you for reaching out...",
                "created_at": "2026-01-05T11:00:00Z"
            }
        ],
        "notes": []
    }
}
```

### Update Message

```
PATCH /api/admin/messages/:id
```

**Request Body:**
```json
{
    "status": "in_progress",
    "assigned_to": "staff-uuid"
}
```

### Reply to Message

```
POST /api/admin/messages/:id/reply
```

**Request Body:**
```json
{
    "content": "Thank you for your inquiry...",
    "sendEmail": true
}
```

### Bulk Operations

```
POST /api/admin/messages/bulk
```

**Request Body:**
```json
{
    "action": "update_status",
    "messageIds": ["uuid1", "uuid2", "uuid3"],
    "data": {
        "status": "archived"
    }
}
```

**Actions:** `update_status`, `assign`, `archive`, `delete`

### Export Messages

```
GET /api/admin/messages/export
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `from` | date | Start date |
| `to` | date | End date |
| `format` | string | `csv` (default) or `json` |

---

## Saved Replies

### List Saved Replies

```
GET /api/admin/replies
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `search` | string | Search in title, content, shortcut |
| `limit` | number | Items per page |
| `offset` | number | Offset for pagination |

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "title": "Welcome Greeting",
            "content": "Hello! Thank you for reaching out...",
            "category": "greetings",
            "shortcut": "/hello",
            "is_global": true,
            "use_count": 42,
            "created_by": "uuid",
            "created_by_name": "Admin"
        }
    ]
}
```

### Get Categories

```
GET /api/admin/replies/categories
```

### Get Frequently Used

```
GET /api/admin/replies/frequent
```

### Get by Shortcut

```
GET /api/admin/replies/shortcut/:shortcut
```

### Create Saved Reply

```
POST /api/admin/replies
```

**Request Body:**
```json
{
    "title": "Thank You Response",
    "content": "Thank you for contacting us!",
    "category": "closings",
    "shortcut": "/thanks",
    "isGlobal": false
}
```

### Update Saved Reply

```
PUT /api/admin/replies/:id
```

### Delete Saved Reply

```
DELETE /api/admin/replies/:id
```

### Track Usage

```
POST /api/admin/replies/:id/use
```

---

## Drafts

### List Drafts

```
GET /api/admin/drafts
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `entityType` | string | Filter by type (message, chat, consultation) |
| `limit` | number | Items per page |

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "entity_type": "message",
            "entity_id": "uuid",
            "content": "Draft reply content...",
            "entity_name": "John Doe",
            "entity_email": "john@example.com",
            "updated_at": "2026-01-05T10:30:00Z"
        }
    ]
}
```

### Get Draft Count

```
GET /api/admin/drafts/count
```

### Get Draft for Entity

```
GET /api/admin/drafts/:entityType/:entityId
```

### Save Draft (Auto-save)

```
POST /api/admin/drafts
```

**Request Body:**
```json
{
    "entityType": "message",
    "entityId": "uuid",
    "content": "Draft content...",
    "subject": "Optional subject"
}
```

### Delete Draft

```
DELETE /api/admin/drafts/:id
```

---

## Staff Management

### List Staff

```
GET /api/admin/staff
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role (admin, manager, staff) |
| `isActive` | boolean | Filter by active status |

### Create Staff

```
POST /api/admin/staff
```

**Request Body:**
```json
{
    "email": "new@tekvwarho.com",
    "password": "securepassword123",
    "name": "New Staff",
    "role": "staff",
    "department": "Support",
    "permissions": {
        "can_manage_messages": true,
        "can_manage_consultations": true,
        "can_manage_chats": true,
        "can_view_analytics": false
    }
}
```

### Activate/Deactivate Staff

```
POST /api/admin/staff/:id/activate
POST /api/admin/staff/:id/deactivate
```

### Reset Staff Password

```
POST /api/admin/staff/:id/reset-password
```

**Request Body:**
```json
{
    "newPassword": "newSecurePassword123"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
    "success": false,
    "message": "Error description",
    "errors": [
        {
            "field": "email",
            "message": "Valid email is required"
        }
    ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Rate Limiting

Rate limits are applied per IP address:

| Endpoint Type | Limit |
|--------------|-------|
| Login | 5 attempts / 15 minutes |
| Password Reset | 3 attempts / hour |
| General API | 100 requests / minute |
| Contact Form | 5 submissions / hour |

When rate limited, you'll receive:

```json
{
    "success": false,
    "message": "Too many requests. Please try again later."
}
```

---

## Pagination Headers

For paginated responses, Link headers are provided:

```
Link: </api/admin/messages?page=2>; rel="next", </api/admin/messages?page=10>; rel="last"
X-Total-Count: 150
X-Page: 1
X-Per-Page: 20
```

---

## WebSocket Events

### Chat WebSocket

**Connection:** `ws://localhost:5500`

**Events:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `visitor_join` | Client → Server | Visitor starts a chat |
| `staff_join` | Client → Server | Staff joins a chat |
| `message` | Bidirectional | Chat message |
| `typing` | Bidirectional | Typing indicator |
| `chat_ended` | Server → Client | Chat session ended |

**Message Format:**
```json
{
    "type": "message",
    "sessionId": "uuid",
    "content": "Hello!",
    "sender": "visitor",
    "timestamp": "2026-01-05T10:30:00Z"
}
```

---

## Changelog

### v1.0 (January 2026)
- Initial API documentation
- Authentication endpoints
- Messages CRUD with pagination
- Saved replies and drafts
- Staff management
- Rate limiting
