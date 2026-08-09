-- Nothing previously gated Google Workspace provisioning on whether the
-- new hire had actually accepted their offer - IT could click "Create
-- Workspace Account" the moment a staff record existed, before a contract
-- was even sent. This adds an explicit, HR-set checkpoint.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMP;
