-- Third and final onboarding gate, after offer acceptance and Workspace
-- provisioning: welcome_email_sent_at tracks the explicit "Send Welcome
-- Email" IT action (split out from provisioning itself, so IT can verify
-- the account before credentials go out), and workspace_activated_at is
-- set only once Google's login audit log confirms the hire's first
-- successful sign-in - that's what promotes them to appearing as real
-- Active staff, not just having accepted an offer.

ALTER TABLE staff
    ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS workspace_activated_at TIMESTAMP;
