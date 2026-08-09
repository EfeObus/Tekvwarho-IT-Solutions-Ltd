-- Internal helpdesk: any staff member can submit an IT issue or a
-- development task/bug; IT Support and Development triage and resolve
-- them. Separate from the customer-facing messages/consultations system.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_manage_tickets BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'it_support', -- it_support, development
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
    requested_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, category);
CREATE INDEX IF NOT EXISTS idx_tickets_requested_by ON tickets(requested_by);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);

-- IT Support and Development get ticket-queue access by default, matching
-- the department presets already used for the other permission flags.
UPDATE staff SET can_manage_tickets = true WHERE department IN ('IT Support', 'Development') AND can_manage_tickets IS NOT true;
