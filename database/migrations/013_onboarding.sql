-- New-hire onboarding checklist, plus a permission flag so IT Support (a
-- department today, not a role - see contract_templates) can be granted
-- access to just the onboarding workflow without full staff/payroll access.
--
-- Some onboarding facts already have a real system of record elsewhere
-- (contract generated -> employee_contracts, handbook/code of conduct
-- acknowledged -> document_acknowledgments) and are read live from those
-- tables rather than duplicated here. onboarding_tasks only holds the
-- facts with no existing system of record (signed copy received,
-- orientation, equipment, account provisioning).

ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_manage_onboarding BOOLEAN DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS workspace_email VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS workspace_provisioned_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
    task_key VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    owner VARCHAR(20) NOT NULL DEFAULT 'hr', -- hr, it
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, done
    completed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_staff ON onboarding_tasks(staff_id, status);
