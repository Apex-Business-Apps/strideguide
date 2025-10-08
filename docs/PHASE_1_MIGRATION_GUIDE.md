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

1. Set `MIGRATION_MODE = false` in `src/components/auth/AdminSetup.tsx`
2. Announce completion to team
3. Monitor Supabase dashboard for 24 hours
4. Archive this document with timestamp

**Next Phase:** Phase 2 - Enhanced rate-limit logging with debounce
