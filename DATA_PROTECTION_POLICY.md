# Data Protection Policy

## Tekvwa IT Solutions Ltd — NDPA/NDPR Compliance Framework

> **Version:** 1.0
> **Effective Date:** August 8, 2026
> **Last Updated:** August 8, 2026
> **Legal Basis:** Nigeria Data Protection Act, 2023 (NDPA) and the Nigeria Data Protection Regulation, 2019 (NDPR)

---

> **This is a working draft, not a finished legal document.** It gives Tekvwa a real starting framework aligned with the NDPA/NDPR, built from the actual data the site and admin system collect. Before relying on it as the company's official compliance position — and before deciding whether formal NDPC registration or an annual Compliance Audit Return filing applies — have it reviewed by a Nigerian data protection lawyer or a licensed **Data Protection Compliance Organisation (DPCO)**. That review is not something this document, or any AI tool, can substitute for.

---

## 1. Purpose & Scope

This policy governs how Tekvwa IT Solutions Ltd ("Tekvwa," "we," "us") collects, stores, processes, and protects personal data belonging to website visitors, customers, job applicants, and staff. It applies to the public website (tekvwa.org), the admin dashboard, and any internal systems that touch personal data.

## 2. Data Controller

| | |
|---|---|
| **Legal name** | Tekvwa IT Solutions Ltd |
| **Registration** | RC 9748441, Corporate Affairs Commission, Ughelli, Delta State, Nigeria |
| **Address** | 16 Orhono, Eku, Delta State, Nigeria |
| **Data protection contact** | info@tekvwa.org |

## 3. Data Protection Officer (DPO)

The NDPA requires a designated DPO for data controllers/processors "of major importance" — broadly, organizations processing personal data of Nigerians above certain volume thresholds set by the NDPC, or those processing sensitive personal data at scale. Tekvwa is a young company and **may not yet cross that threshold**, but designating a clear point of accountability now is good practice regardless of whether formal designation is legally required yet.

**Interim data protection contact:** the individual holding the `info@tekvwa.org` admin account is Tekvwa's point of contact for all data protection matters until a dedicated DPO is formally appointed. Revisit this designation as headcount and data volume grow — a DPCO can confirm when formal appointment becomes mandatory.

## 4. What We Collect

| Source | Data collected |
|---|---|
| Contact form | Name, email, phone (optional), company (optional), message content |
| Consultation booking | Name, email, phone, company, service interest, scheduling preferences, notes |
| Live chat | Name, email, chat message content |
| Newsletter signup | Name (optional), email |
| Automatic (all visitors) | IP address, browser/device type, pages visited, referral source, cookies (see Cookie Policy) |
| Staff accounts | Name, email, role, department, phone, login activity |

We do not knowingly collect personal data from anyone under 18, and we do not sell, trade, or rent personal data to third parties.

## 5. Lawful Basis for Processing

| Activity | Lawful basis (NDPA Art. 25 / NDPR Art. 2.2) |
|---|---|
| Responding to contact/booking inquiries | Consent + necessary to take steps at the data subject's request prior to entering a contract |
| Delivering contracted services | Performance of a contract |
| Newsletter marketing | Consent (opt-in, with unsubscribe available on every email) |
| Security, fraud prevention, audit logging | Legitimate interest |
| Regulatory recordkeeping | Legal obligation |

## 6. Data Retention

| Data type | Retention period | Rationale |
|---|---|---|
| Contact messages | 2 years | Customer service history, dispute resolution |
| Consultation records | 3 years | Service delivery records, potential follow-up engagements |
| Chat conversations | 1 year | Support quality review |
| Analytics/visitor data | 2 years | Trend analysis |
| Newsletter subscribers | Until unsubscribe | Consent-based; removed on withdrawal |
| Staff account data | Duration of employment + 1 year | HR recordkeeping |

Data is deleted or anonymized after its retention period unless a longer period is required by law (e.g., an active legal dispute).

## 7. Data Subject Rights

Under the NDPA, anyone whose data we hold has the right to:

- **Access** — request a copy of the personal data we hold about them
- **Correction** — request correction of inaccurate or incomplete data
- **Erasure/restriction** — request deletion or restricted processing, subject to legal retention requirements
- **Portability** — request their data in a structured, commonly used format
- **Object** — object to processing for direct marketing or legitimate-interest purposes
- **Withdraw consent** — at any time, without affecting prior lawful processing
- **Lodge a complaint** — with the Nigeria Data Protection Commission (NDPC) at [ndpc.gov.ng](https://ndpc.gov.ng)

Requests go to **info@tekvwa.org**. We aim to acknowledge within 5 business days and resolve within the timeframe the NDPA requires (generally within one month, extendable for complex requests).

## 8. Security Measures

Technical and organizational measures currently in place:

- HTTPS/TLS enforced site-wide (managed SSL certificate)
- Passwords hashed with bcrypt (cost factor 12); never stored or logged in plaintext
- Role-based access control — staff only see data relevant to their permissions
- JWT-based authentication with short-lived access tokens and rotating refresh tokens
- Rate limiting on all public-facing forms and login endpoints
- Input sanitization and parameterized database queries (SQL injection prevention)
- Secrets (database credentials, signing keys) stored in Google Secret Manager, not in source code
- Database not directly reachable from the public internet — only via an authenticated, encrypted connection from the application server
- Audit logging of staff actions on customer records

See `SECURITY_POLICY.md` for full technical detail.

## 9. Data Breach Response

In the event of a suspected personal data breach:

1. **Contain** the breach and assess scope/severity immediately upon discovery.
2. **Notify the NDPC within 72 hours** of becoming aware of the breach, where the breach is likely to result in a risk to affected individuals' rights and freedoms (NDPA requirement).
3. **Notify affected individuals without undue delay** if the breach is likely to result in a high risk to their rights (e.g., exposed passwords, financial data).
4. **Document** the breach, its cause, impact, and remediation in an internal incident log, regardless of whether NDPC notification was required.
5. **Review and remediate** the root cause to prevent recurrence.

See `BACKUP_RECOVERY.md` for the disaster-recovery procedures that support this.

## 10. Third-Party Processors

| Processor | Purpose | Data shared |
|---|---|---|
| Google Cloud (Cloud Run, Cloud SQL) | Application hosting and database | All data described in §4 |
| Google Workspace | Business email (info@tekvwa.org) | Email correspondence |

We only share data with processors under terms consistent with NDPA cross-border transfer requirements (Google's standard data processing terms and its recognized international certifications apply here). We do not use processors for purposes beyond operating the services described in this policy.

## 11. Staff Responsibilities

All staff with access to the admin dashboard must:

- Use their own individual login — never share credentials
- Only access customer data relevant to their assigned role/permissions
- Report suspected data breaches or security incidents immediately to the data protection contact (§3)
- Complete basic data protection awareness before receiving account access (informal for now; formalize as the team grows)

## 12. Annual Compliance Audit Return

Nigerian organizations that process personal data of more than 2,000 data subjects in a 12-month period are required under the NDPR to file an annual **Compliance Audit Return** with the NDPC, submitted through a licensed DPCO, by **March 15** each year. **Tekvwa should assess current data subject volume against this threshold with a licensed DPCO** to determine whether this filing obligation currently applies — this document does not make that determination.

## 13. Review

This policy is reviewed whenever the data we collect, our processors, or applicable law changes, and at minimum annually.

## 14. Contact

Questions about this policy or Tekvwa's data practices: **info@tekvwa.org**
