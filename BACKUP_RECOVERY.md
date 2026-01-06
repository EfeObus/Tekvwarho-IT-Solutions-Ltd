# Backup & Disaster Recovery Policy

## Tekvwarho IT Solutions Ltd

> **Version:** 1.0  
> **Effective Date:** January 5, 2026  
> **Last Review:** January 5, 2026

---

## 1. Overview

This document outlines the backup and disaster recovery procedures for Tekvwarho IT Solutions Ltd's systems and data. The goal is to ensure business continuity and minimize data loss in the event of system failures, security incidents, or natural disasters.

---

## 2. Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RPO** (Recovery Point Objective) | 15 minutes | Maximum acceptable data loss |
| **RTO** (Recovery Time Objective) | 1 hour | Maximum acceptable downtime |
| **MTTR** (Mean Time to Recover) | 30 minutes | Average recovery time |

---

## 3. Backup Schedule

### 3.1 Database Backups

| Backup Type | Frequency | Time | Retention | Storage |
|-------------|-----------|------|-----------|---------|
| Full Backup | Daily | 2:00 AM EST | 30 days | Cloud Storage (S3/Azure) |
| Incremental | Every 6 hours | 8AM, 2PM, 8PM | 7 days | Cloud Storage |
| Transaction Logs | Every 15 minutes | Continuous | 7 days | Local + Cloud |
| Monthly Archive | First Sunday | 3:00 AM EST | 12 months | Cold Storage |

### 3.2 Application Backups

| Component | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| Application Code | On commit | Unlimited | Git Repository |
| Configuration Files | On change | 90 days | Git + Cloud Storage |
| Environment Variables | Weekly | 90 days | Encrypted Cloud Storage |
| Uploaded Files | Daily | 30 days | Cloud Storage |

### 3.3 System Backups

| Component | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| Server Images | Weekly | 4 weeks | Cloud Provider Snapshots |
| SSL Certificates | On renewal | Current + 1 previous | Encrypted Storage |
| DNS Configuration | On change | Unlimited | Version Controlled |

---

## 4. Backup Procedures

### 4.1 Automated Database Backup

```bash
#!/bin/bash
# Daily backup script (runs at 2:00 AM via cron)

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="tekvwarho_IT_solutions"
S3_BUCKET="tekvwarho-backups"

# Create backup
pg_dump -Fc $DB_NAME > $BACKUP_DIR/full_$DATE.dump

# Compress
gzip $BACKUP_DIR/full_$DATE.dump

# Upload to S3
aws s3 cp $BACKUP_DIR/full_$DATE.dump.gz s3://$S3_BUCKET/database/

# Clean up old local backups (keep 7 days)
find $BACKUP_DIR -name "*.dump.gz" -mtime +7 -delete

# Verify backup
pg_restore --list $BACKUP_DIR/full_$DATE.dump.gz > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Backup verified successfully"
else
    echo "BACKUP VERIFICATION FAILED" | mail -s "Backup Alert" admin@tekvwarho.com
fi
```

### 4.2 Backup Verification

| Check | Frequency | Method |
|-------|-----------|--------|
| Backup completion | Daily | Automated monitoring |
| File integrity | Daily | Checksum verification |
| Restore test | Weekly | Test environment restoration |
| Full DR drill | Quarterly | Complete system recovery |

---

## 5. Data Retention Policy

### 5.1 Business Data Retention

| Data Type | Retention Period | After Retention |
|-----------|-----------------|-----------------|
| Contact Messages | 2 years | Archive then delete |
| Chat Conversations | 1 year | Anonymize, delete after 2 years |
| Consultation Records | 3 years | Archive (legal requirements) |
| Analytics Data | 2 years | Aggregate, delete raw data |
| Audit Logs | 5 years | Archive to cold storage |
| Newsletter Subscribers | Until unsubscribe + 1 year | Delete |

### 5.2 System Data Retention

| Data Type | Retention Period | After Retention |
|-----------|-----------------|-----------------|
| Access Logs | 90 days | Delete |
| Error Logs | 30 days | Delete |
| Security Logs | 1 year | Archive |
| Session Data | 30 days | Delete |
| Refresh Tokens | 7 days + grace | Delete |

### 5.3 Automatic Cleanup

```sql
-- Run daily via cron job

-- Clean up expired sessions
DELETE FROM active_sessions 
WHERE is_active = false 
AND created_at < NOW() - INTERVAL '30 days';

-- Clean up expired refresh tokens
DELETE FROM refresh_tokens 
WHERE expires_at < NOW() - INTERVAL '7 days';

-- Archive old audit logs (move to archive table)
INSERT INTO audit_logs_archive 
SELECT * FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## 6. Disaster Recovery Procedures

### 6.1 Incident Classification

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| **Critical** | Complete system failure | Server down, data breach | Immediate |
| **High** | Major service degradation | Database corruption, API failure | 30 minutes |
| **Medium** | Partial service impact | Feature unavailable, slow performance | 2 hours |
| **Low** | Minor issues | UI bugs, non-critical errors | 24 hours |

### 6.2 Recovery Procedures

#### Scenario 1: Database Failure

**Steps:**
1. Identify the failure type (corruption, hardware, connection)
2. Check if the issue is with the connection or the database itself
3. If database is corrupted:
   - Stop application server
   - Identify last good backup
   - Restore backup to staging first
   - Verify data integrity
   - Switch to restored database
   - Restart application server
   - Apply transaction logs if available
4. Notify affected users if downtime exceeds 15 minutes

**Commands:**
```bash
# Stop application
pm2 stop all

# Restore database
pg_restore -d tekvwarho_IT_solutions_restored /backups/latest.dump

# Verify restoration
psql -d tekvwarho_IT_solutions_restored -c "SELECT COUNT(*) FROM staff;"

# Switch connection
# Update .env DATABASE_URL to restored database

# Restart application
pm2 start all
```

#### Scenario 2: Application Server Failure

**Steps:**
1. Check server health (CPU, memory, disk)
2. Review recent deployments for issues
3. If hardware failure:
   - Spin up replacement server from latest image
   - Configure environment variables
   - Point DNS to new server
   - Verify functionality
4. If software issue:
   - Roll back to previous deployment
   - Investigate and fix issue
   - Re-deploy fixed version

#### Scenario 3: Security Breach

**Steps:**
1. Immediately isolate affected systems
2. Revoke all active sessions and tokens
3. Rotate all secrets (JWT_SECRET, DB credentials, API keys)
4. Analyze attack vector
5. Patch vulnerability
6. Restore from clean backup if data was affected
7. Notify affected users as required by law
8. Document incident and lessons learned

```bash
# Revoke all tokens
psql -d tekvwarho_IT_solutions -c "UPDATE refresh_tokens SET revoked_at = NOW();"
psql -d tekvwarho_IT_solutions -c "UPDATE active_sessions SET is_active = false;"

# Rotate JWT secret
# Generate new secret and update .env
openssl rand -hex 64

# Restart application with new secrets
pm2 restart all
```

### 6.3 Communication Plan

| Audience | Channel | When | Who |
|----------|---------|------|-----|
| Technical Team | Slack/Phone | Immediately | On-call engineer |
| Management | Email/Phone | Within 15 minutes | Team lead |
| Customers | Email/Status page | Within 30 minutes | Support team |
| Public | Website/Social | If extended outage | Marketing |

---

## 7. Testing & Validation

### 7.1 Test Schedule

| Test Type | Frequency | Last Test | Next Test |
|-----------|-----------|-----------|-----------|
| Backup Verification | Weekly | Auto | Auto |
| Restore Test (Staging) | Monthly | - | - |
| Full DR Drill | Quarterly | - | - |
| Tabletop Exercise | Annually | - | - |

### 7.2 Test Checklist

- [ ] Verify backup files exist and are not corrupted
- [ ] Test restore to staging environment
- [ ] Verify all data is accessible after restore
- [ ] Test application functionality after restore
- [ ] Measure actual recovery time
- [ ] Document any issues encountered
- [ ] Update procedures based on findings

---

## 8. Roles & Responsibilities

| Role | Responsibility | Contact |
|------|----------------|---------|
| **Backup Administrator** | Daily backup monitoring, verification | - |
| **On-Call Engineer** | First responder for incidents | - |
| **Technical Lead** | Escalation point, major decisions | - |
| **CEO/CTO** | Final authority, external communication | Efe Obukohwo |

---

## 9. Documentation & Runbooks

### 9.1 Runbook Locations

| Document | Location | Access |
|----------|----------|--------|
| Primary Runbooks | /docs/runbooks/ | Technical team |
| Backup Runbooks | Cloud storage | Technical team |
| Emergency Contacts | Printed in office | All staff |

### 9.2 Key Runbooks

- `runbook-database-restore.md`
- `runbook-server-recovery.md`
- `runbook-security-incident.md`
- `runbook-dns-failover.md`

---

## 10. Review & Updates

This policy will be reviewed:
- Quarterly for accuracy
- After any disaster recovery event
- When significant system changes occur

**Document Owner:** Technical Lead  
**Last Review:** January 5, 2026  
**Next Review:** April 5, 2026

---

*For questions about this policy, contact: efe.obukohwo@outlook.com*
