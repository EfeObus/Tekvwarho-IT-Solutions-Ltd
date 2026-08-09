-- Adds "Legal" as a recognized department (staff.department and
-- contract_templates.department are both free-text VARCHAR with no CHECK
-- constraint, so no schema change is needed to allow the value - this
-- migration only seeds a starter contract template for it, matching the
-- other six departments seeded in 009_contracts.sql).

INSERT INTO contract_templates (department, job_title, job_description) VALUES
    ('Legal', 'Legal Advisor', 'Provide compliance and contract-review support; read-only visibility into company analytics for oversight purposes.')
ON CONFLICT (department) DO NOTHING;
