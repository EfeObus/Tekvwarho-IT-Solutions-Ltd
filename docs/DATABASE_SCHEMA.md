# Tekvwarho IT Solutions - Database Schema Documentation

> **Version:** 1.0  
> **Database:** PostgreSQL  
> **Last Updated:** January 2026

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          TEKVWARHO IT SOLUTIONS DATABASE                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐      ┌──────────────────────┐      ┌─────────────────────┐
│       STAFF         │      │    REFRESH_TOKENS    │      │   ACTIVE_SESSIONS   │
├─────────────────────┤      ├──────────────────────┤      ├─────────────────────┤
│ PK id (UUID)        │◄────┐│ PK id (UUID)         │◄────┐│ PK id (UUID)        │
│ email (VARCHAR)     │     ││ FK user_id           │─────┤│ FK user_id          │──┐
│ password_hash       │     ││ token_hash           │     ││ FK refresh_token_id │──┤
│ name (VARCHAR)      │     ││ expires_at           │     ││ last_activity       │  │
│ role (VARCHAR)      │     ││ created_at           │     ││ is_active           │  │
│ department          │     ││ revoked_at           │     ││ created_at          │  │
│ phone               │     ││ replaced_by (self)   │     │└─────────────────────┘  │
│ is_active           │     ││ user_agent           │     │                         │
│ must_change_password│     ││ ip_address           │     │                         │
│ can_manage_messages │     │└──────────────────────┘     │                         │
│ can_manage_consults │     │                             │                         │
│ can_manage_chats    │     │                             │                         │
│ can_view_analytics  │     │                             │                         │
│ token_version       │     │                             │                         │
│ created_at          │     │                             │                         │
│ updated_at          │     │                             │                         │
│ last_login          │     │                             │                         │
│ FK created_by       │─────┘                             │                         │
└─────────────────────┘                                   │                         │
         │                                                 │                         │
         │ 1:N                                             │                         │
         ▼                                                 │                         │
┌─────────────────────┐                                   │                         │
│    AUDIT_LOGS       │                                   │                         │
├─────────────────────┤                                   │                         │
│ PK id (UUID)        │                                   │                         │
│ FK staff_id         │◄──────────────────────────────────┘                         │
│ action (VARCHAR)    │                                                             │
│ entity_type         │                                                             │
│ entity_id           │                                                             │
│ old_values (JSONB)  │                                                             │
│ new_values (JSONB)  │                                                             │
│ ip_address          │                                                             │
│ user_agent          │                                                             │
│ created_at          │                                                             │
└─────────────────────┘                                                             │
                                                                                     │
┌─────────────────────┐      ┌──────────────────────┐                               │
│     VISITORS        │      │      MESSAGES        │                               │
├─────────────────────┤      ├──────────────────────┤                               │
│ PK id (UUID)        │◄────┐│ PK id (UUID)         │                               │
│ name (VARCHAR)      │     ││ FK visitor_id        │──┐                            │
│ email (VARCHAR)     │     ││ name (VARCHAR)       │  │                            │
│ ip_address          │     ││ email (VARCHAR)      │  │                            │
│ user_agent          │     ││ company              │  │                            │
│ first_visit         │     ││ service              │  │                            │
│ last_visit          │     ││ message (TEXT)       │  │                            │
│ page_views          │     ││ status               │  │                            │
│ source              │     ││ FK assigned_to       │──┼────────────────────────────┘
│ created_at          │     ││ search_vector        │  │
└─────────────────────┘     ││ created_at           │  │
         │                  ││ updated_at           │  │
         │                  │└──────────────────────┘  │
         │                  │         │                │
         │                  │         │ 1:N            │
         │                  │         ▼                │
         │                  │ ┌──────────────────────┐ │
         │                  │ │  MESSAGE_REPLIES     │ │
         │                  │ ├──────────────────────┤ │
         │                  │ │ PK id (UUID)         │ │
         │                  │ │ FK message_id        │ │
         │                  │ │ FK staff_id          │─┤
         │                  │ │ content (TEXT)       │ │
         │                  │ │ sent_to_email        │ │
         │                  │ │ created_at           │ │
         │                  │ └──────────────────────┘ │
         │                  │                          │
         │                  │                          │
         ▼                  │                          │
┌─────────────────────┐     │                          │
│   CHAT_SESSIONS     │     │                          │
├─────────────────────┤     │                          │
│ PK id (UUID)        │◄────┤                          │
│ FK visitor_id       │     │                          │
│ visitor_name        │     │                          │
│ visitor_email       │     │                          │
│ status              │     │                          │
│ department          │     │                          │
│ FK assigned_to      │─────┼──────────────────────────┘
│ started_at          │     │
│ ended_at            │     │
│ rating              │     │
│ feedback            │     │
│ search_vector       │     │
│ created_at          │     │
└─────────────────────┘     │
         │                  │
         │ 1:N              │
         ▼                  │
┌─────────────────────┐     │
│   CHAT_MESSAGES     │     │
├─────────────────────┤     │
│ PK id (UUID)        │     │
│ FK session_id       │     │
│ sender_type         │     │
│ FK sender_id        │─────┘
│ content (TEXT)      │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐      ┌──────────────────────┐
│   CONSULTATIONS     │      │   SAVED_REPLIES      │
├─────────────────────┤      ├──────────────────────┤
│ PK id (UUID)        │      │ PK id (UUID)         │
│ FK visitor_id       │      │ title (VARCHAR)      │
│ name (VARCHAR)      │      │ content (TEXT)       │
│ email (VARCHAR)     │      │ category (VARCHAR)   │
│ company             │      │ shortcut (VARCHAR)   │
│ phone               │      │ is_global (BOOLEAN)  │
│ service             │      │ use_count (INTEGER)  │
│ booking_date        │      │ last_used_at         │
│ booking_time        │      │ FK created_by        │──┐
│ notes               │      │ created_at           │  │
│ status              │      │ updated_at           │  │
│ FK assigned_to      │      └──────────────────────┘  │
│ search_vector       │                                │
│ created_at          │      ┌──────────────────────┐  │
│ updated_at          │      │       DRAFTS         │  │
└─────────────────────┘      ├──────────────────────┤  │
                             │ PK id (UUID)         │  │
┌─────────────────────┐      │ FK staff_id          │──┘
│  INTERNAL_NOTES     │      │ entity_type          │
├─────────────────────┤      │ entity_id (UUID)     │
│ PK id (UUID)        │      │ content (TEXT)       │
│ entity_type         │      │ subject              │
│ entity_id (UUID)    │      │ created_at           │
│ FK staff_id         │      │ updated_at           │
│ content (TEXT)      │      └──────────────────────┘
│ is_pinned           │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐      ┌──────────────────────┐      ┌─────────────────────┐
│       TAGS          │      │    ENTITY_TAGS       │      │   SYSTEM_SETTINGS   │
├─────────────────────┤      ├──────────────────────┤      ├─────────────────────┤
│ PK id (UUID)        │◄─────│ FK tag_id            │      │ PK id (UUID)        │
│ name (VARCHAR)      │      │ entity_type          │      │ setting_key         │
│ color (VARCHAR)     │      │ entity_id (UUID)     │      │ setting_value       │
│ created_at          │      │ created_at           │      │ setting_type        │
└─────────────────────┘      └──────────────────────┘      │ category            │
                                                           │ description         │
┌─────────────────────┐                                    │ FK updated_by       │
│  ANALYTICS_EVENTS   │                                    │ updated_at          │
├─────────────────────┤                                    └─────────────────────┘
│ PK id (UUID)        │
│ FK visitor_id       │                                    ┌─────────────────────┐
│ event_type          │                                    │    NEWSLETTER       │
│ event_data (JSONB)  │                                    ├─────────────────────┤
│ page_url            │                                    │ PK id (UUID)        │
│ referrer            │                                    │ email (VARCHAR)     │
│ ip_address          │                                    │ status              │
│ user_agent          │                                    │ subscribed_at       │
│ session_id          │                                    │ unsubscribed_at     │
│ created_at          │                                    │ ip_address          │
└─────────────────────┘                                    │ created_at          │
                                                           └─────────────────────┘
```

---

## Table Descriptions

### Core Tables

#### `staff`
Stores admin/staff user accounts with roles and permissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email address |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| name | VARCHAR(255) | Display name |
| role | VARCHAR(50) | admin, manager, or staff |
| department | VARCHAR(100) | Department assignment |
| is_active | BOOLEAN | Account active status |
| must_change_password | BOOLEAN | Force password change on login |
| can_manage_* | BOOLEAN | Granular permissions |
| token_version | INTEGER | Invalidates tokens on increment |

#### `refresh_tokens`
Secure token rotation for JWT refresh tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (also the token value) |
| user_id | UUID | FK to staff |
| token_hash | VARCHAR(255) | SHA256 hash for verification |
| expires_at | TIMESTAMP | Token expiration |
| revoked_at | TIMESTAMP | When token was invalidated |
| replaced_by | UUID | Points to new token in rotation |

#### `messages`
Contact form submissions and customer inquiries.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| visitor_id | UUID | FK to visitors |
| name | VARCHAR(255) | Sender name |
| email | VARCHAR(255) | Sender email |
| message | TEXT | Message content |
| status | VARCHAR(50) | new, in_progress, converted, archived |
| assigned_to | UUID | FK to staff |
| search_vector | TSVECTOR | Full-text search index |

#### `chat_sessions`
Live chat session records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| visitor_id | UUID | FK to visitors |
| status | VARCHAR(50) | waiting, active, ended |
| assigned_to | UUID | FK to staff |
| rating | INTEGER | 1-5 rating |
| feedback | TEXT | Customer feedback |

#### `consultations`
Scheduled consultation bookings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| booking_date | DATE | Scheduled date |
| booking_time | TIME | Scheduled time |
| status | VARCHAR(50) | scheduled, completed, cancelled, no_show |
| assigned_to | UUID | FK to staff |

---

### Support Tables

#### `saved_replies`
Quick response templates for common inquiries.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR(255) | Template name |
| content | TEXT | Template content |
| category | VARCHAR(100) | Grouping category |
| shortcut | VARCHAR(50) | Quick access (e.g., /hello) |
| is_global | BOOLEAN | Available to all staff |
| use_count | INTEGER | Usage tracking |

#### `drafts`
Auto-saved reply drafts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| staff_id | UUID | FK to staff |
| entity_type | VARCHAR(50) | message, chat, consultation |
| entity_id | UUID | Related entity |
| content | TEXT | Draft content |

#### `internal_notes`
Private staff notes on entities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| entity_type | VARCHAR(50) | message, chat, consultation |
| entity_id | UUID | Related entity |
| staff_id | UUID | Author |
| content | TEXT | Note content |
| is_pinned | BOOLEAN | Pin to top |

---

## Indexes

```sql
-- Authentication & Sessions
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id, revoked_at);
CREATE INDEX idx_active_sessions_user ON active_sessions(user_id, is_active);

-- Messages
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_search ON messages USING gin(search_vector);

-- Chats
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_sessions_search ON chat_sessions USING gin(search_vector);

-- Consultations
CREATE INDEX idx_consultations_date ON consultations(booking_date);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_search ON consultations USING gin(search_vector);

-- Analytics
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Audit
CREATE INDEX idx_audit_logs_staff ON audit_logs(staff_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Notes & Tags
CREATE INDEX idx_internal_notes_entity ON internal_notes(entity_type, entity_id);
CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);

-- Saved Replies & Drafts
CREATE INDEX idx_saved_replies_user ON saved_replies(created_by, is_global);
CREATE INDEX idx_drafts_staff ON drafts(staff_id);
CREATE INDEX idx_drafts_entity ON drafts(entity_type, entity_id);
```

---

## Triggers

### Update Timestamp Trigger
Automatically updates `updated_at` on row modification.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applied to: staff, messages, consultations, saved_replies, drafts
```

### Full-Text Search Triggers
Automatically updates search vectors on insert/update.

```sql
-- Messages
CREATE TRIGGER messages_search_update 
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION messages_search_trigger();

-- Chat Sessions
CREATE TRIGGER chat_sessions_search_update 
BEFORE INSERT OR UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION chat_sessions_search_trigger();

-- Consultations
CREATE TRIGGER consultations_search_update 
BEFORE INSERT OR UPDATE ON consultations
FOR EACH ROW EXECUTE FUNCTION consultations_search_trigger();
```

---

## Foreign Key Relationships

```
staff (1) ──────────────────┬──── (N) messages.assigned_to
                            ├──── (N) chat_sessions.assigned_to
                            ├──── (N) consultations.assigned_to
                            ├──── (N) message_replies.staff_id
                            ├──── (N) internal_notes.staff_id
                            ├──── (N) audit_logs.staff_id
                            ├──── (N) refresh_tokens.user_id
                            ├──── (N) active_sessions.user_id
                            ├──── (N) saved_replies.created_by
                            └──── (N) drafts.staff_id

visitors (1) ───────────────┬──── (N) messages.visitor_id
                            ├──── (N) chat_sessions.visitor_id
                            ├──── (N) consultations.visitor_id
                            └──── (N) analytics_events.visitor_id

messages (1) ───────────────┴──── (N) message_replies.message_id

chat_sessions (1) ──────────┴──── (N) chat_messages.session_id

tags (1) ───────────────────┴──── (N) entity_tags.tag_id
```

---

## Data Retention Policies

| Table | Retention | Action |
|-------|-----------|--------|
| audit_logs | 2 years | Archive to cold storage |
| analytics_events | 1 year | Aggregate then delete |
| chat_messages | 1 year | Delete |
| drafts | 30 days | Auto-cleanup function |
| refresh_tokens | 30 days | Delete expired |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial schema documentation |
