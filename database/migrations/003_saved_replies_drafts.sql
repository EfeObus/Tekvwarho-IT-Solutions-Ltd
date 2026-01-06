-- Tekvwarho IT Solutions Database Migrations
-- Phase 3: Drafts, Saved Replies, and Search Enhancements

-- ==================== SAVED REPLIES TABLE ====================
-- Quick response templates for common queries

CREATE TABLE IF NOT EXISTS saved_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    shortcut VARCHAR(50), -- e.g., /greeting, /pricing, /thankyou
    is_global BOOLEAN DEFAULT false, -- Available to all staff if true
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint on shortcut per user (or global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_replies_shortcut 
    ON saved_replies(shortcut, created_by) 
    WHERE shortcut IS NOT NULL;

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_saved_replies_user ON saved_replies(created_by, is_global);
CREATE INDEX IF NOT EXISTS idx_saved_replies_category ON saved_replies(category);

-- ==================== DRAFTS TABLE ====================
-- Auto-saved draft messages

CREATE TABLE IF NOT EXISTS drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- message, chat, consultation
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    subject VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_drafts_staff ON drafts(staff_id);
CREATE INDEX IF NOT EXISTS idx_drafts_entity ON drafts(entity_type, entity_id);

-- ==================== FULL-TEXT SEARCH INDEXES ====================
-- For faster search across messages

-- Create tsvector column for messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index on search vector
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING gin(search_vector);

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION messages_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.company, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.message, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.service, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS messages_search_update ON messages;
CREATE TRIGGER messages_search_update BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION messages_search_trigger();

-- Update existing rows
UPDATE messages SET search_vector = 
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(company, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(message, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(service, '')), 'D');

-- ==================== CHAT SESSIONS SEARCH ====================

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_search ON chat_sessions USING gin(search_vector);

CREATE OR REPLACE FUNCTION chat_sessions_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.visitor_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.visitor_email, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_sessions_search_update ON chat_sessions;
CREATE TRIGGER chat_sessions_search_update BEFORE INSERT OR UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION chat_sessions_search_trigger();

-- ==================== CONSULTATIONS SEARCH ====================

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_consultations_search ON consultations USING gin(search_vector);

CREATE OR REPLACE FUNCTION consultations_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.company, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consultations_search_update ON consultations;
CREATE TRIGGER consultations_search_update BEFORE INSERT OR UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION consultations_search_trigger();

-- ==================== DEFAULT SAVED REPLIES ====================

INSERT INTO saved_replies (id, title, content, category, shortcut, is_global, created_by)
SELECT 
    uuid_generate_v4(),
    'Welcome Greeting',
    'Hello! Thank you for reaching out to Tekvwarho IT Solutions. How may I assist you today?',
    'greetings',
    '/hello',
    true,
    (SELECT id FROM staff WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM saved_replies WHERE shortcut = '/hello');

INSERT INTO saved_replies (id, title, content, category, shortcut, is_global, created_by)
SELECT 
    uuid_generate_v4(),
    'Thank You Message',
    'Thank you for contacting us! We appreciate your interest in our services. Is there anything else I can help you with?',
    'closings',
    '/thanks',
    true,
    (SELECT id FROM staff WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM saved_replies WHERE shortcut = '/thanks');

INSERT INTO saved_replies (id, title, content, category, shortcut, is_global, created_by)
SELECT 
    uuid_generate_v4(),
    'Consultation Booking',
    'I would be happy to schedule a free consultation for you. You can book a time that works for you at: [booking link]. Alternatively, let me know your preferred time and I can arrange it for you.',
    'sales',
    '/consult',
    true,
    (SELECT id FROM staff WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM saved_replies WHERE shortcut = '/consult');

INSERT INTO saved_replies (id, title, content, category, shortcut, is_global, created_by)
SELECT 
    uuid_generate_v4(),
    'Follow-up Request',
    'Thank you for your inquiry. To better assist you, could you please provide more details about:
- Your current situation/challenges
- Your goals and timeline
- Your budget range (if applicable)',
    'questions',
    '/followup',
    true,
    (SELECT id FROM staff WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM saved_replies WHERE shortcut = '/followup');

INSERT INTO saved_replies (id, title, content, category, shortcut, is_global, created_by)
SELECT 
    uuid_generate_v4(),
    'Pricing Information',
    'Our pricing varies depending on project scope and requirements. For a detailed quote, we would need to understand your specific needs. Would you like to schedule a brief call to discuss?',
    'pricing',
    '/pricing',
    true,
    (SELECT id FROM staff WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM saved_replies WHERE shortcut = '/pricing');

-- ==================== TIMESTAMP TRIGGERS ====================

CREATE TRIGGER update_saved_replies_updated_at BEFORE UPDATE ON saved_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== CLEANUP FUNCTION ====================
-- Scheduled job to clean up old drafts

CREATE OR REPLACE FUNCTION cleanup_old_drafts(days_old INTEGER DEFAULT 30) 
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM drafts 
    WHERE updated_at < NOW() - (days_old || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
