-- Compliance & Document Vault (Admin only for now - no Secretary role yet,
-- since there's no one hired into that role. Scope deliberately excludes
-- speculative governance structure (board resolutions, cap table,
-- shareholder register) until there's an actual board or investor to build
-- it around.)

CREATE TABLE IF NOT EXISTS compliance_deadlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    recurring VARCHAR(20) DEFAULT 'none', -- none, monthly, yearly
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed
    completed_at TIMESTAMP,
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vault_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'other', -- incorporation, license, permit, tax, other
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL, -- GCS object path
    file_size INTEGER,
    mime_type VARCHAR(100),
    expiry_date DATE,
    uploaded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    posted_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compliance_due ON compliance_deadlines(due_date, status);
CREATE INDEX IF NOT EXISTS idx_vault_expiry ON vault_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_notices_created ON company_notices(created_at DESC);

-- A couple of real, immediately-relevant starter deadlines so this isn't
-- an empty feature on day one - based on the company's actual RC 9748441
-- (CAC, Ughelli, Delta State) and DBIR PAYE remittance obligations.
INSERT INTO compliance_deadlines (title, description, due_date, recurring) VALUES
    ('CAC Annual Return', 'File the annual return for RC 9748441 with the Corporate Affairs Commission.', (CURRENT_DATE + INTERVAL '11 months')::date, 'yearly'),
    ('DBIR PAYE Remittance', 'Remit the previous month PAYE deductions to the Delta State Board of Internal Revenue.', (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '9 days')::date, 'monthly');
