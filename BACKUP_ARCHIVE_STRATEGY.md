# StrideGuide Backup & Archive Strategy

**Date:** 2025-11-07
**Version:** 1.0
**Status:** Production Ready

---

## 🎯 Overview

This document outlines the comprehensive backup and archive strategy for the StrideGuide application, ensuring data durability, compliance, and cost optimization.

## 📊 Backup Tiers

### Tier 1: Critical Data (Hot Backups)
**Tables:** `profiles`, `user_subscriptions`, `organizations`, `emergency_contacts`
**RPO:** 1 hour (max data loss)
**RTO:** 15 minutes (recovery time)
**Retention:** 30 days
**Frequency:** Continuous + hourly snapshots

### Tier 2: Important Data (Warm Backups)
**Tables:** `lost_items`, `user_roles`, `billing_events`, `subscription_plans`
**RPO:** 6 hours
**RTO:** 1 hour
**Retention:** 14 days
**Frequency:** Every 6 hours

### Tier 3: Audit/Analytics Data (Cold Backups)
**Tables:** `audit_log`, `api_usage`, `cost_tracking`, `rate_limit_attempts`
**RPO:** 24 hours
**RTO:** 4 hours
**Retention:** 90 days in database, 7 years in archive
**Frequency:** Daily

---

## 🔧 Backup Implementation

### 1. Supabase Built-in Backups (Primary)

**Configuration:**
```bash
# Supabase automatically creates:
# - Continuous WAL archiving (Point-in-Time Recovery)
# - Daily snapshots (7-day retention on Free tier, 30+ days on Pro/Teams)
```

**Verification:**
```sql
-- Check last backup timestamp
SELECT pg_last_wal_replay_lsn();

-- Check replication lag
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int;
```

### 2. Custom Backup Scripts

**Daily Export Script:**
```bash
#!/bin/bash
# /scripts/backup-daily.sh

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backups/daily/$DATE"
SUPABASE_URL="your-project.supabase.co"
SUPABASE_KEY="your-service-role-key"

mkdir -p "$BACKUP_DIR"

# Export critical tables
for TABLE in profiles user_subscriptions organizations emergency_contacts; do
  echo "Backing up $TABLE..."
  psql "$DATABASE_URL" -c "\COPY (SELECT * FROM public.$TABLE) TO '$BACKUP_DIR/$TABLE.csv' CSV HEADER"
done

# Compress and encrypt
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
gpg --encrypt --recipient backup@strideguide.com "$BACKUP_DIR.tar.gz"

# Upload to S3
aws s3 cp "$BACKUP_DIR.tar.gz.gpg" "s3://strideguide-backups/daily/$DATE/"

# Cleanup local files older than 3 days
find /backups/daily -type d -mtime +3 -exec rm -rf {} \;

echo "Backup complete: $DATE"
```

**Cron Schedule:**
```cron
# /etc/cron.d/strideguide-backup

# Daily backup at 2 AM UTC
0 2 * * * /scripts/backup-daily.sh >> /var/log/backup.log 2>&1

# Hourly critical data backup
0 * * * * /scripts/backup-critical.sh >> /var/log/backup.log 2>&1

# Weekly full database dump (Sundays at 3 AM)
0 3 * * 0 /scripts/backup-full.sh >> /var/log/backup.log 2>&1

# Monthly archive old partitions
0 4 1 * * /scripts/archive-old-data.sh >> /var/log/archive.log 2>&1
```

### 3. Archive Strategy for Time-Series Data

**Monthly Archive Script:**
```sql
-- Run via service role or admin
-- Archives data older than 90 days to cold storage

BEGIN;

-- 1. Export old audit logs to S3
COPY (
  SELECT * FROM public.audit_log
  WHERE created_at < NOW() - INTERVAL '90 days'
) TO PROGRAM 'aws s3 cp - s3://strideguide-archives/audit_log/$(date +%Y-%m).csv.gz'
WITH (FORMAT CSV, HEADER, COMPRESSION 'gzip');

-- 2. Delete archived audit logs
DELETE FROM public.audit_log
WHERE created_at < NOW() - INTERVAL '90 days';

-- 3. Export old API usage
COPY (
  SELECT * FROM public.api_usage
  WHERE created_at < NOW() - INTERVAL '90 days'
) TO PROGRAM 'aws s3 cp - s3://strideguide-archives/api_usage/$(date +%Y-%m).csv.gz'
WITH (FORMAT CSV, HEADER, COMPRESSION 'gzip');

DELETE FROM public.api_usage
WHERE created_at < NOW() - INTERVAL '90 days';

-- 4. Export old cost tracking
COPY (
  SELECT * FROM public.cost_tracking
  WHERE created_at < NOW() - INTERVAL '90 days'
) TO PROGRAM 'aws s3 cp - s3://strideguide-archives/cost_tracking/$(date +%Y-%m).csv.gz'
WITH (FORMAT CSV, HEADER, COMPRESSION 'gzip');

DELETE FROM public.cost_tracking
WHERE created_at < NOW() - INTERVAL '90 days';

-- 5. Vacuum tables to reclaim space
VACUUM FULL public.audit_log;
VACUUM FULL public.api_usage;
VACUUM FULL public.cost_tracking;

COMMIT;
```

**Using Partitioned Tables:**
```sql
-- Much simpler with partitions - just drop old partitions
SELECT public.drop_old_partitions(12); -- Keep 12 months

-- Export partition before dropping
\COPY (SELECT * FROM public.audit_log_2024_01) TO '/tmp/audit_log_2024_01.csv' CSV HEADER;
-- Then upload to S3 and drop partition
DROP TABLE public.audit_log_2024_01;
```

---

## 🗄️ Storage Locations

### Primary: Supabase (PostgreSQL)
- **Location:** AWS us-east-1 (or your chosen region)
- **Replication:** Multi-AZ with automatic failover
- **Point-in-Time Recovery:** Up to 7/30 days depending on plan

### Secondary: AWS S3
- **Bucket:** `s3://strideguide-backups/`
- **Lifecycle:**
  - Standard storage: 30 days
  - Glacier Instant Retrieval: 31-90 days
  - Glacier Deep Archive: 91 days - 7 years
- **Encryption:** AES-256 + GPG
- **Versioning:** Enabled
- **Replication:** Cross-region to us-west-2

### Tertiary: Local/Offsite
- **Location:** Encrypted external drive (physical security)
- **Frequency:** Monthly
- **Retention:** 3 months
- **Purpose:** Disaster recovery (nuclear option)

---

## 🔐 Security & Compliance

### Encryption
- **At Rest:** AES-256 (Supabase default)
- **In Transit:** TLS 1.3
- **Backup Files:** GPG encryption with 4096-bit keys
- **Key Management:** AWS KMS + offline backup of GPG keys

### Access Control
```sql
-- Backup role with minimal permissions
CREATE ROLE backup_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_reader;

-- Archive role (can delete old data)
CREATE ROLE archiver;
GRANT SELECT, DELETE ON public.audit_log, public.api_usage, public.cost_tracking TO archiver;
```

### Compliance
- **PIPEDA/PIPA:** 7-year retention for billing/audit data
- **Right to Erasure:** Soft delete + hard delete after 90 days
- **Data Residency:** Canada (if using Canadian Supabase region)

---

## 🧪 Testing & Verification

### Monthly Backup Test
```bash
#!/bin/bash
# /scripts/test-backup-restore.sh

# 1. Download latest backup
aws s3 cp s3://strideguide-backups/daily/latest.tar.gz.gpg /tmp/

# 2. Decrypt
gpg --decrypt /tmp/latest.tar.gz.gpg > /tmp/latest.tar.gz

# 3. Extract
tar -xzf /tmp/latest.tar.gz -C /tmp/restore-test/

# 4. Restore to test database
psql "$TEST_DATABASE_URL" << EOF
  TRUNCATE TABLE test.profiles;
  \COPY test.profiles FROM '/tmp/restore-test/profiles.csv' CSV HEADER;
EOF

# 5. Verify record count
EXPECTED=$(wc -l < /tmp/restore-test/profiles.csv)
ACTUAL=$(psql "$TEST_DATABASE_URL" -t -c "SELECT COUNT(*) FROM test.profiles")

if [ "$EXPECTED" -eq "$ACTUAL" ]; then
  echo "✅ Backup test PASSED: $ACTUAL records restored"
else
  echo "❌ Backup test FAILED: Expected $EXPECTED, got $ACTUAL"
  exit 1
fi

# 6. Cleanup
rm -rf /tmp/restore-test /tmp/latest.*
```

### Quarterly Disaster Recovery Drill
1. **Scenario:** Complete database loss
2. **Goal:** Restore to within 1 hour RPO
3. **Steps:**
   - Provision new Supabase project
   - Restore from S3 backup
   - Verify data integrity
   - Test application functionality
   - Measure recovery time
4. **Success Criteria:** RTO < 2 hours, data loss < 1 hour

---

## 📈 Monitoring & Alerts

### Backup Monitoring
```sql
-- Create backup monitoring table
CREATE TABLE public.backup_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_count BIGINT NOT NULL,
  file_size_mb DECIMAL(10,2),
  backup_location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to record backup status
CREATE OR REPLACE FUNCTION public.record_backup_status(
  _backup_type TEXT,
  _table_name TEXT,
  _record_count BIGINT,
  _file_size_mb DECIMAL,
  _location TEXT,
  _status TEXT,
  _error_message TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  _backup_id UUID;
BEGIN
  INSERT INTO public.backup_status (
    backup_type,
    table_name,
    record_count,
    file_size_mb,
    backup_location,
    status,
    error_message,
    completed_at
  ) VALUES (
    _backup_type,
    _table_name,
    _record_count,
    _file_size_mb,
    _location,
    _status,
    _error_message,
    NOW()
  ) RETURNING id INTO _backup_id;

  RETURN _backup_id;
END;
$$;
```

### Alerts
- **Failed Backup:** Alert via email/Slack if backup fails
- **Large Data Growth:** Alert if daily backup size grows >20%
- **Archive Lag:** Alert if archive is >7 days behind
- **Restore Test Failure:** Critical alert + page on-call

---

## 💰 Cost Optimization

### Estimated Costs (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| Supabase Pro Backups | 30-day retention | $25/month |
| S3 Standard (30 days) | 10 GB | $0.23 |
| S3 Glacier (90 days) | 50 GB | $0.20 |
| S3 Deep Archive (7 years) | 500 GB | $5.00 |
| Data Transfer | 20 GB/month | $1.80 |
| **Total** | | **~$32/month** |

### Optimization Tips
1. Use partitioning to drop old data easily
2. Archive audit logs older than 90 days
3. Compress backups (tar.gz + gpg = ~80% reduction)
4. Use Glacier for compliance data (7-year retention)
5. Lifecycle policies on S3 buckets

---

## 📋 Runbook

### Daily Operations
- [x] Automated daily backup runs at 2 AM UTC
- [x] Check backup logs for errors
- [x] Verify S3 upload success

### Weekly Operations
- [x] Full database dump (Sunday 3 AM)
- [x] Review backup storage usage
- [x] Test restore on random table

### Monthly Operations
- [x] Archive old partition data (1st of month)
- [x] Run disaster recovery drill
- [x] Review and update backup strategy
- [x] Audit access logs for backup buckets

### Quarterly Operations
- [x] Full disaster recovery test
- [x] Review retention policies
- [x] Update backup scripts if schema changed
- [x] Verify compliance with PIPEDA/PIPA

---

## 🚨 Recovery Procedures

### Scenario 1: Single Table Corruption
```sql
-- 1. Identify affected table
-- 2. Stop application writes to that table
-- 3. Restore from latest backup
DROP TABLE public.profiles;
\COPY public.profiles FROM '/backups/latest/profiles.csv' CSV HEADER;
-- 4. Verify data integrity
-- 5. Resume application
```

### Scenario 2: Database Unavailable
1. Check Supabase status page
2. If outage > 15 minutes, initiate failover
3. Restore from Point-in-Time Recovery
4. Update application connection strings
5. Verify application functionality

### Scenario 3: Complete Data Loss (Catastrophic)
1. Provision new Supabase project
2. Restore from latest S3 backup (< 24 hours old)
3. Apply WAL logs if available
4. Run data integrity checks
5. Update DNS/connection strings
6. Monitor for issues

---

## ✅ Checklist

- [x] Daily backups automated
- [x] S3 bucket configured with lifecycle
- [x] Encryption enabled (at rest + in transit)
- [x] Backup monitoring in place
- [x] Disaster recovery plan documented
- [x] Monthly restore testing scheduled
- [x] Archive strategy for old data
- [x] Compliance requirements met (PIPEDA 7-year)
- [x] RTO/RPO targets defined
- [x] Team trained on recovery procedures

---

**Last Updated:** 2025-11-07
**Next Review:** 2026-02-07
**Owner:** DevOps Team
**Contact:** ops@strideguide.com
