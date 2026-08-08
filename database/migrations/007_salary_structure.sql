-- Nigerian salary structure breakdown
-- base_salary (added in migration 005) is treated as the Basic Salary
-- component specifically. Gross monthly pay = basic + these allowances.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS housing_allowance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS utility_allowance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS meal_allowance NUMERIC(12,2) DEFAULT 0;
