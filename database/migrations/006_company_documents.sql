-- Company Documents (Employee Handbook, Code of Conduct)
-- Versioned content admin can edit, with per-staff acknowledgment tracking
-- so there's a record of who has read and agreed to the current version.

CREATE TABLE IF NOT EXISTS company_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_type VARCHAR(50) NOT NULL UNIQUE, -- 'handbook', 'code_of_conduct'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    doc_version INTEGER NOT NULL,
    acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    UNIQUE(staff_id, doc_type, doc_version)
);

CREATE INDEX IF NOT EXISTS idx_doc_ack_staff ON document_acknowledgments(staff_id, doc_type);

-- Starter content - a reasonable draft for a small Nigerian technology
-- company to customize. This is a starting point, not legal advice; the
-- leave, disciplinary, and termination sections in particular should be
-- reviewed against the Nigerian Labour Act before being treated as binding.
INSERT INTO company_documents (doc_type, title, content, version) VALUES
(
    'handbook',
    'Employee Handbook',
    '<h2>Welcome to Tekvwa IT Solutions Ltd</h2>
<p>This handbook outlines what you can expect from us and what we expect from you. It applies to every employee, regardless of department or role.</p>

<h3>1. About Us</h3>
<p>Tekvwa IT Solutions Ltd was founded in August 2026 and is registered in Ughelli, Delta State, Nigeria (RC 9748441). We provide IT consulting, software development, website development, and data analytics services.</p>

<h3>2. Working Hours</h3>
<p>Standard working hours are Monday to Friday, 9:00 AM to 5:00 PM (Nigeria time), with a one-hour lunch break. Some roles may require flexibility around client meetings or deadlines - your manager will discuss this with you directly.</p>

<h3>3. Leave</h3>
<p>Employees are entitled to statutory annual leave in line with the Nigerian Labour Act. Leave requests should be submitted to your manager with reasonable notice. Sick leave requires notifying your manager as early as possible, with supporting documentation for extended absences.</p>

<h3>4. Communication</h3>
<p>We are a small, distributed team. Respond to messages during working hours in a reasonable time, keep your manager informed of blockers, and use the internal tools provided (this dashboard, company email) for work communication rather than personal accounts.</p>

<h3>5. Use of Company Systems</h3>
<p>Company accounts, devices, and systems are provided for business use. Do not share your login credentials. Report any suspected security incident to your manager or the system administrator immediately.</p>

<h3>6. Confidentiality</h3>
<p>You will have access to client and company information as part of your role. This information is confidential and must not be shared outside the company, both during and after your employment - see the Code of Conduct for details.</p>

<h3>7. Disciplinary Process</h3>
<p>Where performance or conduct issues arise, we aim for a fair process: an informal conversation first, followed by a documented verbal warning, a written warning, and, if necessary, termination - each stage proportionate to the issue. Serious misconduct may bypass earlier stages.</p>

<h3>8. Questions</h3>
<p>If anything in this handbook is unclear, reach out to HR or the Managing Director.</p>',
    1
    ),
(
    'code_of_conduct',
    'Code of Conduct',
    '<h2>Code of Conduct</h2>
<p>This code sets out the standard of behavior expected from everyone at Tekvwa IT Solutions Ltd, inside the company and when representing us externally.</p>

<h3>1. Professionalism</h3>
<p>Treat colleagues, clients, and partners with respect. Disagreements should be handled constructively - raise concerns directly and professionally rather than letting them go unaddressed.</p>

<h3>2. Anti-Harassment &amp; Anti-Discrimination</h3>
<p>Harassment, discrimination, or bullying of any kind - based on gender, ethnicity, religion, disability, or any other protected characteristic - will not be tolerated. Report any incident to HR or the Managing Director; all reports will be treated seriously and in confidence.</p>

<h3>3. Conflicts of Interest</h3>
<p>Disclose any outside work, financial interest, or relationship that could conflict with your responsibilities here, particularly anything involving our clients or competitors.</p>

<h3>4. Confidentiality &amp; Data Protection</h3>
<p>Client data and company information must be handled in line with our Data Protection Policy and the Nigeria Data Protection Act. Only access customer data you need for your role, and never share it outside authorized channels.</p>

<h3>5. Company Property &amp; IT Use</h3>
<p>Company equipment, software licenses, and accounts are for business use. Do not install unauthorized software on company devices or use company systems for activity unrelated to your work.</p>

<h3>6. Social Media &amp; Public Statements</h3>
<p>You are welcome to mention where you work, but do not speak on behalf of the company publicly (including on social media) without authorization, and never share confidential client or company information.</p>

<h3>7. Reporting Concerns</h3>
<p>If you witness or experience a violation of this code, report it to HR or the Managing Director. Retaliation against anyone who reports a genuine concern in good faith is itself a violation of this code.</p>

<h3>8. Acknowledgment</h3>
<p>By clicking "I Have Read and Agree" in the dashboard, you confirm you have read, understood, and agree to follow this Code of Conduct.</p>',
    1
    )
ON CONFLICT (doc_type) DO NOTHING;
