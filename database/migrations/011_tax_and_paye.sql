-- NIN/TIN tracking and statutory deduction line items on paystubs.
-- NIN is mandatory for new hires (enforced at the route level - not a DB
-- NOT NULL constraint, since existing staff predate this field). TIN is
-- optional; if absent, the staff record is flagged as needing DBIR
-- registration (HR/Accountant workflow, not something this app automates -
-- there's no public API for DBIR/JTB TIN issuance).

ALTER TABLE staff ADD COLUMN IF NOT EXISTS nin VARCHAR(11);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tin VARCHAR(20);

-- Split paystub deductions into named statutory line items (auto-calculated)
-- plus the existing free-form "other deductions" (manual, e.g. salary
-- advances). Pension and NHF are deliberately NOT included yet, per
-- explicit instruction - this company isn't enrolling those yet.
ALTER TABLE paystubs ADD COLUMN IF NOT EXISTS paye_tax NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE paystubs ADD COLUMN IF NOT EXISTS cra_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE paystubs ADD COLUMN IF NOT EXISTS development_levy NUMERIC(12,2) NOT NULL DEFAULT 0;
