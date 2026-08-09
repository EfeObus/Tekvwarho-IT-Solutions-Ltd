-- Upgrades employee_contracts from a compensation summary into a full offer
-- letter: adds the operational/legal fields (reporting line, employment
-- status, PTO, probation, notice periods, confidentiality is fixed template
-- text so no column needed, expiration) plus a click-to-accept e-signature
-- record (hashed token, like password-reset tokens - never store the raw
-- token - expiry, and who/when/where accepted).

ALTER TABLE employee_contracts
    ADD COLUMN IF NOT EXISTS reporting_to VARCHAR(255),
    ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'Full-Time',
    ADD COLUMN IF NOT EXISTS pto_days INTEGER,
    ADD COLUMN IF NOT EXISTS probation_period VARCHAR(100),
    ADD COLUMN IF NOT EXISTS resignation_notice VARCHAR(100),
    ADD COLUMN IF NOT EXISTS termination_notice VARCHAR(100),
    ADD COLUMN IF NOT EXISTS offer_expiration_date DATE,
    ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS sender_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS acceptance_token_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS acceptance_token_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS accepted_ip VARCHAR(64),
    ADD COLUMN IF NOT EXISTS accepted_signature_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_token
    ON employee_contracts(acceptance_token_hash)
    WHERE acceptance_token_hash IS NOT NULL;
