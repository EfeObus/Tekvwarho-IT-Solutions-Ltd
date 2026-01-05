-- Tekvwarho IT Solutions Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Staff/Admin Users Table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff', -- admin, manager, staff
    department VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT true,
    can_manage_messages BOOLEAN DEFAULT true,
    can_manage_consultations BOOLEAN DEFAULT true,
    can_manage_chats BOOLEAN DEFAULT true,
    can_view_analytics BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

-- Visitors Table (for tracking and chat)
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    page_views INTEGER DEFAULT 1,
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    service VARCHAR(100),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new', -- new, in_progress, converted, archived
    assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Replies Table
CREATE TABLE IF NOT EXISTS message_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    sent_to_email BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, closed
    assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- visitor, staff
    sender_id UUID, -- staff_id if staff, null if visitor
    content TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consultations/Bookings Table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    service VARCHAR(100),
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/Toronto',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
    assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- page_view, form_submit, chat_start, booking
    page_url VARCHAR(500),
    referrer VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Internal Notes Table (for messages, consultations, chats)
CREATE TABLE IF NOT EXISTS internal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- message, consultation, chat
    entity_id UUID NOT NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#6b7280',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity Tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS entity_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- message, consultation, chat, visitor
    entity_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tag_id, entity_type, entity_id)
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- string, boolean, number, json
    category VARCHAR(50) DEFAULT 'general', -- general, chat, email, booking, notifications
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

-- Insert default system settings
INSERT INTO system_settings (id, setting_key, setting_value, setting_type, category, description) VALUES
    (uuid_generate_v4(), 'chat_enabled', 'true', 'boolean', 'chat', 'Enable/disable live chat widget'),
    (uuid_generate_v4(), 'chat_offline_message', 'We are currently offline. Please leave a message and we will get back to you.', 'string', 'chat', 'Message shown when chat is offline'),
    (uuid_generate_v4(), 'chat_auto_reply', 'Thank you for your message! One of our team members will be with you shortly.', 'string', 'chat', 'Auto-reply message for new chats'),
    (uuid_generate_v4(), 'chat_auto_reply_enabled', 'true', 'boolean', 'chat', 'Enable auto-reply for new chats'),
    (uuid_generate_v4(), 'business_hours_start', '09:00', 'string', 'general', 'Business hours start time'),
    (uuid_generate_v4(), 'business_hours_end', '17:00', 'string', 'general', 'Business hours end time'),
    (uuid_generate_v4(), 'working_days', '["Monday","Tuesday","Wednesday","Thursday","Friday"]', 'json', 'general', 'Working days of the week'),
    (uuid_generate_v4(), 'booking_lead_time_hours', '24', 'number', 'booking', 'Minimum hours in advance for booking'),
    (uuid_generate_v4(), 'booking_slot_duration_minutes', '60', 'number', 'booking', 'Duration of each booking slot in minutes'),
    (uuid_generate_v4(), 'email_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable email notifications'),
    (uuid_generate_v4(), 'notification_new_message', 'true', 'boolean', 'notifications', 'Notify on new contact messages'),
    (uuid_generate_v4(), 'notification_new_chat', 'true', 'boolean', 'notifications', 'Notify on new chat sessions'),
    (uuid_generate_v4(), 'notification_new_booking', 'true', 'boolean', 'notifications', 'Notify on new consultation bookings')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default tags
INSERT INTO tags (id, name, color) VALUES
    (uuid_generate_v4(), 'High Priority', '#ef4444'),
    (uuid_generate_v4(), 'Urgent', '#f97316'),
    (uuid_generate_v4(), 'Follow-up', '#eab308'),
    (uuid_generate_v4(), 'High Value', '#22c55e'),
    (uuid_generate_v4(), 'VIP', '#8b5cf6'),
    (uuid_generate_v4(), 'New Lead', '#3b82f6'),
    (uuid_generate_v4(), 'Returning Customer', '#06b6d4')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(booking_date);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff ON audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_internal_notes_entity ON internal_notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
