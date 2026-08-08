-- HR and Accountant roles
-- Two new permission flags on staff, plus the salary fields payroll needs.
-- base_salary is intentionally admin-only to edit (see server/routes/admin.js) -
-- Accountants can post/record payments against it but cannot change the figure
-- itself, so a salary increase always requires Admin sign-off.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_manage_employees BOOLEAN DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_manage_payroll BOOLEAN DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12,2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'NGN';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE;
