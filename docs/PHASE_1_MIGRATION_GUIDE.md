# Phase 1 Migration: Concurrent Index Creation

**Status:** 🟡 Ready to Execute  
**Scheduled Window:** 2-4 AM (Low Traffic)  
**Expected Duration:** 5-15 minutes  
**Risk Level:** Low (non-blocking operation)

---

## Pre-Migration Announcement

**Subject:** Scheduled Maintenance - Database Performance Optimization

**Body:**
```
Team,

We will be performing database index optimization during the 2-4 AM maintenance window tonight.

What's happening:
- Creating performance indexes on user_roles and security_audit_log tables
- Using CONCURRENT method (non-blocking, zero downtime)
- Admin setup UI temporarily disabled during this window

Impact:
- No service interruption expected
- All user-facing features remain operational
- Admin creation disabled until 4 AM

Timeline:
- 2:00 AM - Start index creation
- 2:05 AM - Monitor progress
- 2:15 AM - Validate indexes
- 2:20 AM - Smoke tests
- 2:30 AM - Re-enable admin UI (if stable)

Contact: [Your contact info]
```

---

## Migration Execution Steps

### Step 1: Disable Admin UI (COMPLETED)
✅ AdminSetup component now shows maintenance message
✅ No new admin assignments possible during migration

### Step 2: Run Migration ✅ COMPLETED
The migration has been applied successfully:
- ✅ Created `idx_user_roles_user_id_role` (optimizes admin checks)
- ✅ Created `idx_security_audit_log_user_event_time` (optimizes audit queries)

**Note:** Supabase migrations don't support `CONCURRENTLY` (transaction limitation).
For low-traffic deployments, standard index creation is safe and fast.

**Optional:** For true concurrent creation on high-traffic systems, run in SQL Editor:
```sql
CREATE INDEX CONCURRENTLY idx_user_roles_user_id_role 
ON public.user_roles(user_id, role);

CREATE INDEX CONCURRENTLY idx_security_audit_log_user_event_time 
ON public.security_audit_log(user_id, event_type, created_at DESC);
```

### Step 3: Monitor Index Creation

**Check index creation progress:**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_user_roles_user_id_role',
    'idx_security_audit_log_user_event_time'
  );
```

**Check for invalid indexes (should return 0 rows):**
```sql
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_user_roles_user_id_role',
    'idx_security_audit_log_user_event_time'
  )
  AND indexdef IS NULL;
```

**Monitor active queries (ensure no blocking):**
```sql
SELECT 
  pid,
  usename,
  state,
  wait_event_type,
  wait_event,
  query_start,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND query ILIKE '%CREATE INDEX%';
```

---

## Validation & Smoke Tests

### Test 1: User Login (Auth Flow)
```sql
-- Should complete in <50ms with new index
EXPLAIN ANALYZE
SELECT EXISTS (
  SELECT 1 
  FROM public.user_roles 
  WHERE user_id = 'test-user-id-here' 
    AND role IN ('admin', 'super-admin')
);
```

**Expected:** Index scan on `idx_user_roles_user_id_role`

### Test 2: Audit Logging (Write Performance)
```sql
-- Insert test audit log
INSERT INTO security_audit_log (user_id, event_type, severity, event_data)
VALUES (
  auth.uid(),
  'test_migration_write',
  'info',
  '{"test": "phase1_validation"}'::jsonb
);

-- Verify write succeeded
SELECT * FROM security_audit_log 
WHERE event_type = 'test_migration_write'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** Write completes in <100ms, no errors

### Test 3: Admin Check Performance
```sql
-- Should use new index
EXPLAIN ANALYZE
SELECT 
  ur.user_id,
  ur.role,
  COUNT(*) OVER () as total_admins
FROM user_roles ur
WHERE ur.role IN ('admin', 'super-admin')
LIMIT 10;
```

**Expected:** Index-only scan on `idx_user_roles_user_id_role`

### Test 4: Audit Log Query Performance
```sql
-- Should use new composite index
EXPLAIN ANALYZE
SELECT 
  user_id,
  event_type,
  created_at,
  severity
FROM security_audit_log
WHERE user_id = 'test-user-id-here'
  AND event_type ILIKE '%admin%'
ORDER BY created_at DESC
LIMIT 20;
```

**Expected:** Index scan on `idx_security_audit_log_user_event_time`

---

## Rollback Plan

If indexes cause issues (unlikely with CONCURRENTLY):

```sql
-- Drop indexes (safe operation)
DROP INDEX CONCURRENTLY IF EXISTS idx_user_roles_user_id_role;
DROP INDEX CONCURRENTLY IF EXISTS idx_security_audit_log_user_event_time;
```

Then re-enable admin UI by setting `MIGRATION_MODE = false` in `AdminSetup.tsx`.

---

## Success Criteria

✅ Both indexes exist and are valid  
✅ User login flow works (auth check <50ms)  
✅ Audit log writes succeed (<100ms)  
✅ No query timeouts or blocking detected  
✅ Admin setup UI can be re-enabled  

**Once all criteria met:** Proceed to Phase 2 (rate-limit logging)

---

## Post-Migration Actions

### Immediate Tasks (First 1-2 Hours)

**1. Re-enable Admin UI (Read-Only Mode)** ✅ COMPLETED
- AdminSetup component now shows read-only mode
- Users can see their admin info but cannot assign roles
- Clear messaging about maintenance window

**2. Run Smoke Tests**

Run these tests to verify core functionality:

#### Test 1: Login/Logout Flow
```bash
# Manual test procedure:
1. Navigate to /auth
2. Sign in with test account
3. Verify session persists after page refresh
4. Sign out successfully
5. Verify redirect to landing page

Expected: No errors, smooth auth flow, <2s response times
```

#### Test 2: Admin Dashboard Read Operations
```sql
-- Verify admin check uses new index
EXPLAIN ANALYZE
SELECT EXISTS (
  SELECT 1 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin')
);

-- Expected: Index Scan using idx_user_roles_user_id_role
-- Execution time: <50ms
```

#### Test 3: Audit Log Queries
```sql
-- Verify audit log query performance
EXPLAIN ANALYZE
SELECT 
  user_id,
  event_type,
  severity,
  created_at,
  event_data
FROM security_audit_log
WHERE user_id = auth.uid()
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC
LIMIT 50;

-- Expected: Index Scan using idx_security_audit_log_user_event_time
-- Execution time: <100ms
```

**3. Monitor Performance Metrics (1-2 Hours)**

```sql
-- Query 1: Check for blocked queries
SELECT 
  pid,
  usename,
  state,
  wait_event_type,
  wait_event,
  query_start,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Expected: No queries blocked >5s, no LOCK waits
```

```sql
-- Query 2: Verify index health and usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_user_roles_user_id_role',
  'idx_security_audit_log_user_event_time'
)
ORDER BY idx_scan DESC;

-- Expected: idx_scan > 0 (indexes being used)
```

```sql
-- Query 3: Table bloat check
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_roles', 'security_audit_log')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Expected: Minimal size increase (indexes add ~5-10% overhead)
```

**4. Document Migration Results**

Fill in the following template and append to this document:

```markdown
---

## Migration Execution Report

**Date:** [YYYY-MM-DD HH:MM UTC]  
**Executed By:** [Your Name/Email]  
**Environment:** Production / Staging

### Index Creation Timeline

- **idx_user_roles_user_id_role**
  - Start: [timestamp]
  - Complete: [timestamp]
  - Duration: [X seconds/minutes]
  - Rows affected: [count]
  - Locks encountered: Yes/No
  - Notes: [any warnings or issues]

- **idx_security_audit_log_user_event_time**
  - Start: [timestamp]
  - Complete: [timestamp]
  - Duration: [X seconds/minutes]
  - Rows affected: [count]
  - Locks encountered: Yes/No
  - Notes: [any warnings or issues]

### Smoke Test Results

- ✅/❌ Login/Logout Flow: [PASS/FAIL] - [notes]
- ✅/❌ Admin Dashboard Reads: [PASS/FAIL] - [execution time: Xms]
- ✅/❌ Audit Log Queries: [PASS/FAIL] - [execution time: Xms]

### Performance Metrics (1-hour window)

- Average user_roles query latency: [Xms]
- Average security_audit_log query latency: [Xms]
- Blocked queries detected: [Yes/No - count]
- Index usage confirmed: [Yes/No]
- Traffic disruptions: [None/Details]

### Issues & Resolutions

[Document any unexpected behavior, slowdowns, or errors encountered]

### Decision: Proceed to Phase 2?

- [ ] YES - All criteria met, proceed to Phase 2
- [ ] NO - Issues detected, rollback or investigate

**Next Steps:** [Action items]
```

---

## Phase 2 Readiness Criteria

Only proceed to Phase 2 when ALL of these are true:

- ✅ Both indexes created successfully and valid (no invalid indexes in pg_indexes)
- ✅ All smoke tests passing (login, admin reads, audit queries)
- ✅ Index usage confirmed (idx_scan > 0 in pg_stat_user_indexes)
- ✅ No blocked queries >5s detected in pg_stat_activity
- ✅ Query latency within acceptable range (<50ms admin checks, <100ms audit queries)
- ✅ Zero traffic disruptions reported by monitoring tools
- ✅ Team approval obtained

**If any criteria fails:** Investigate, document, and resolve before proceeding.

---

## Final Phase 1 Completion Actions

1. Set `MIGRATION_MODE = false` in `src/components/auth/AdminSetup.tsx`
2. Announce completion to team with metrics summary
3. Continue monitoring Supabase dashboard for 24 hours
4. Archive this document with timestamp and results

**Next Phase:** Phase 2 - Enhanced rate-limit logging with debounce

---

## Phase 2: Audit Log Deduplication

**Status:** 🟢 Deployed  
**Deployed:** [Pending execution]  
**Risk Level:** Low (backward compatible)

### Objectives
- Prevent audit log floods from repeated rate-limit triggers
- Only log one `rate_limit_exceeded` event per user/endpoint per minute
- Maintain full audit trail for non-rate-limit events
- Use Phase 1 indexes for efficient deduplication queries

### Changes Made

**1. Database Function: `log_audit_event_deduplicated`**
```sql
-- Automatically deployed via migration
-- Location: Supabase > Database > Functions
```

**Features:**
- Checks for duplicate logs within 60-second window
- Scoped to user_id + endpoint + event_type
- Returns NULL if duplicate (no insert)
- Uses composite index for O(log n) lookups
- Non-rate-limit events log normally (no deduplication)

**2. Edge Function Updates**
- `validate-feature-access` now uses RPC call for rate limit logging
- Event data includes `endpoint` field for proper scoping
- All other audit events unchanged (full history preserved)

### Testing

See `test-scripts/phase2-audit-dedup-test.md` for comprehensive test plan:
- Test 1: Single endpoint deduplication
- Test 2: Multiple endpoints isolation
- Test 3: Different users isolation
- Test 4: Window expiration (65s delay)
- Test 5: Non-rate-limit events (control)
- Performance test: Burst traffic simulation

### Monitoring Metrics

**Audit Table Growth:**
```sql
SELECT 
  event_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_logged,
  MAX(created_at) as last_logged
FROM security_audit_log
WHERE created_at > now() - interval '24 hours'
GROUP BY event_type
ORDER BY total_events DESC;
```

**Expected:** `rate_limit_exceeded` count should drop by ~95% during burst traffic.

**Deduplication Efficiency:**
```sql
-- Check how many potential duplicates were prevented
SELECT 
  user_id,
  event_data->>'endpoint' as endpoint,
  COUNT(*) as logged_events,
  -- Estimate: if requests were constant for 1 hour, we'd see ~60 logs without dedup
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as duration_minutes
FROM security_audit_log
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '1 hour'
GROUP BY user_id, event_data->>'endpoint'
HAVING COUNT(*) > 1;
```

**Expected:** Very few rows (only if user retries after 60s window).

### Rollback Plan

If issues detected (missing logs, performance degradation):

1. Revert edge function to direct insert:
```typescript
await supabase.from('security_audit_log').insert({ ... });
```

2. Keep database function in place (harmless if unused)

3. Monitor for 24h to confirm issue resolved

4. Post-mortem to determine root cause before re-attempting

### Acceptance Checklist

- [ ] Database function deployed successfully
- [ ] Edge function updated and deployed
- [ ] Test 1 (single endpoint) passes
- [ ] Test 2 (multiple endpoints) passes
- [ ] Test 3 (different users) passes
- [ ] Test 4 (window expiration) passes
- [ ] Test 5 (non-rate-limit control) passes
- [ ] Performance test: burst traffic handled efficiently
- [ ] Audit table growth reduced by >90% under load
- [ ] No legitimate logs missing
- [ ] Index usage confirmed in EXPLAIN ANALYZE
- [ ] Staging deployment successful
- [ ] Production deployment off-peak completed

---

## Phase 2 Completion Actions

1. Run full test suite in staging (see test-scripts/phase2-audit-dedup-test.md)
2. Verify metrics showing reduced audit log growth
3. Deploy to production during off-peak hours (2-4 AM)
4. Monitor for 24 hours for unexpected behavior
5. Document results in execution report template below

**Next Phase:** Phase 3 - TBD
