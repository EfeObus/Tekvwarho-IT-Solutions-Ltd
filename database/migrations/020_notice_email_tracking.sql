-- Notices were readable via the API by any authenticated staff member
-- already, but nothing surfaced them anywhere a regular staff member would
-- actually see them (only the admin-gated Compliance page did), and posting
-- one never notified anyone. emailed_at tracks whether the one-time
-- broadcast to all active staff has gone out for a given notice.

ALTER TABLE company_notices
    ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMP;
