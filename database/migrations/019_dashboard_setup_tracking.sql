-- Fourth and final onboarding step: after Workspace activation is
-- confirmed, IT/HR sends a dashboard password-setup link (reusing the
-- existing sendAccountSetupEmail/TokenManager mechanism) so the new hire
-- can actually log into admin.tekvwa.org, not just their Gmail account.
-- Tracked separately from workspace_activated_at since it's a distinct,
-- explicit action that happens after activation, not a gate on it.

ALTER TABLE staff
    ADD COLUMN IF NOT EXISTS dashboard_setup_sent_at TIMESTAMP;
