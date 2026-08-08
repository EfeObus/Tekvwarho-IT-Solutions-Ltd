-- Contract templates (per department, admin/HR-editable defaults) and
-- generated employment contracts (one per staff member per issue, kept as
-- a record even if the template or the employee's salary changes later).

CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department VARCHAR(100) NOT NULL UNIQUE,
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT,
    updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
    department VARCHAR(100),
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT,
    start_date DATE,
    basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    housing_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    utility_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    meal_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'NGN',
    emailed_at TIMESTAMP,
    generated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_staff ON employee_contracts(staff_id);

-- Starter templates matching the five existing departments plus HR/Accounting.
-- Job descriptions are intentionally brief - HR should tailor these per role.
INSERT INTO contract_templates (department, job_title, job_description) VALUES
    ('IT Support', 'IT Support Specialist', 'Provide first-line technical support to internal staff and clients, troubleshoot hardware/software issues, and maintain IT systems documentation.'),
    ('Sales', 'Sales Executive', 'Identify and pursue new business opportunities, manage client relationships, and support the consultation booking pipeline.'),
    ('Development', 'Software Developer', 'Design, build, and maintain software applications for clients and internal use, following company coding and security standards.'),
    ('Customer Service', 'Customer Service Representative', 'Respond to customer inquiries via messages and live chat, resolve issues promptly, and escalate as needed.'),
    ('Human Resources', 'HR Officer', 'Manage staff onboarding, records, and the employee handbook; support hiring and workplace policy compliance.'),
    ('Accounting', 'Accountant', 'Process monthly payroll, maintain financial records, and support budgeting and expense tracking.'),
    ('Management', 'Manager', 'Oversee team performance and operations within assigned department, reporting to the Managing Director.')
ON CONFLICT (department) DO NOTHING;
