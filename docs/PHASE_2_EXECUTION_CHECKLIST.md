# Phase 2: Rate-Limit Logging Debounce - Execution Checklist

**Status:** 🟢 READY TO EXECUTE  
**Deployment Window:** Off-Peak (2-4 AM recommended)  
**Expected Duration:** 2-3 hours (including monitoring)  
**Risk Level:** Low (backward compatible, no schema changes)

---

## Pre-Flight Checklist

### 1. Verify Phase 1 Indexes Exist
```sql
-- Should return 2 rows
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

**Expected:** Both indexes present and valid.

### 2. Verify Admin UI in Read-Only Mode
- Navigate to `/auth` and sign in as admin
- Check AdminSetup component shows "Read-Only" mode
- Confirm assignment button is disabled

**Expected:** ✅ Admin UI visible but non-functional

### 3. Backup Current State
```sql
-- Export current audit log state (last 24h)
COPY (
  SELECT * FROM security_audit_log 
  WHERE created_at > now() - interval '24 hours'
) TO '/tmp/audit_log_backup_phase2.csv' WITH CSV HEADER;

-- Count current rate_limit_exceeded events
SELECT 
  COUNT(*) as total_rate_limit_events,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM security_audit_log
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '24 hours';
```

**Document:** Total events before Phase 2 deployment.

---

## Deployment Steps

### Step 1: Verify Database Function Deployed ✅ COMPLETED
```sql
-- Check function exists
SELECT 
  proname,
  pronargs,
  prorettype::regtype
FROM pg_proc 
WHERE proname = 'log_audit_event_deduplicated';
```

**Expected:** 1 row showing function with 4 arguments returning uuid.

### Step 2: Verify Edge Function Updated ✅ COMPLETED
The `validate-feature-access` edge function now uses:
```typescript
await supabase.rpc('log_audit_event_deduplicated', {
  _user_id: user.id,
  _event_type: 'rate_limit_exceeded',
  _severity: 'warn',
  _event_data: { endpoint: `feature_${featureName}`, ... }
});
```

**Check:** View edge function logs to confirm deployment.

### Step 3: Deploy to Production
- Edge functions auto-deploy with preview builds
- Database function already deployed via migration

**Status:** 🟢 DEPLOYED

---

## Smoke Tests (Execute Immediately After Deployment)

### Test 1: Single Endpoint - Rapid Violations (10 requests)

**Setup:**
1. Obtain auth token for test user
2. Target endpoint: `validate-feature-access` with feature `premium_feature`

**Execute:**
```bash
# Run this script 10 times rapidly (within 5 seconds)
for i in {1..10}; do
  curl -X POST 'https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/validate-feature-access' \
    -H "Authorization: Bearer YOUR_TEST_USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"featureName":"premium_feature"}' &
done
wait
```

**Verify:**
```sql
-- Should return exactly 1 row created in last 2 minutes
SELECT 
  COUNT(*) as log_count,
  MIN(created_at) as first_logged,
  MAX(created_at) as last_logged,
  event_data->>'endpoint' as endpoint,
  user_id
FROM security_audit_log
WHERE event_type = 'rate_limit_exceeded'
  AND event_data->>'endpoint' = 'feature_premium_feature'
  AND created_at > now() - interval '2 minutes'
GROUP BY user_id, event_data->>'endpoint';
```

**PASS CRITERIA:** `log_count = 1` (9 duplicates prevented)

---

### Test 2: Multiple Endpoints - Isolation (2 endpoints)

**Execute:**
```bash
# Endpoint 1: premium_feature
for i in {1..5}; do
  curl -X POST 'https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/validate-feature-access' \
    -H "Authorization: Bearer YOUR_TEST_USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"featureName":"premium_feature"}' &
done

# Wait 2 seconds
sleep 2

# Endpoint 2: enterprise_feature
for i in {1..5}; do
  curl -X POST 'https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/validate-feature-access' \
    -H "Authorization: Bearer YOUR_TEST_USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"featureName":"enterprise_feature"}' &
done
wait
```

**Verify:**
```sql
-- Should return 2 rows (1 per endpoint)
SELECT 
  event_data->>'endpoint' as endpoint,
  COUNT(*) as log_count,
  MIN(created_at) as logged_at
FROM security_audit_log
WHERE user_id = 'YOUR_TEST_USER_ID'
  AND event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '2 minutes'
GROUP BY event_data->>'endpoint'
ORDER BY endpoint;
```

**PASS CRITERIA:** 2 rows, each with `log_count = 1`

---

### Test 3: Different Users - Isolation (2 users)

**Execute:**
```bash
# User A: 10 rapid requests
for i in {1..10}; do
  curl -X POST 'https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/validate-feature-access' \
    -H "Authorization: Bearer USER_A_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"featureName":"premium_feature"}' &
done

# User B: 10 rapid requests
for i in {1..10}; do
  curl -X POST 'https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/validate-feature-access' \
    -H "Authorization: Bearer USER_B_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"featureName":"premium_feature"}' &
done
wait
```

**Verify:**
```sql
-- Should return 2 rows (1 per user)
SELECT 
  user_id,
  COUNT(*) as log_count,
  event_data->>'endpoint' as endpoint
FROM security_audit_log
WHERE user_id IN ('USER_A_ID', 'USER_B_ID')
  AND event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '2 minutes'
GROUP BY user_id, event_data->>'endpoint';
```

**PASS CRITERIA:** 2 rows, each with `log_count = 1`

---

### Test 4: Normal Requests Unaffected (Control Test)

**Execute:**
```bash
# Make 5 SUCCESSFUL requests (within rate limits)
for i in {1..5}; do
  curl -X POST 'https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/validate-feature-access' \
    -H "Authorization: Bearer VALID_PREMIUM_USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"featureName":"premium_feature"}'
  sleep 2  # Wait between requests to avoid rate limit
done
```

**Verify:**
```sql
-- Should return 5 rows (all successful accesses logged)
SELECT 
  COUNT(*) as successful_accesses
FROM security_audit_log
WHERE user_id = 'VALID_PREMIUM_USER_ID'
  AND event_type = 'feature_access_granted'
  AND created_at > now() - interval '2 minutes';
```

**PASS CRITERIA:** `successful_accesses = 5` (non-rate-limit events unaffected)

---

### Test 5: Latency Check (No Performance Regression)

**Execute:**
```bash
# Measure response time with time command
time curl -X POST 'https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/validate-feature-access' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featureName":"premium_feature"}'
```

**Verify:**
- Check `X-Response-Time` header in response
- Compare to baseline (should be < 200ms)

**PASS CRITERIA:** Response time ≤ 200ms (no latency spike from deduplication check)

---

## 2-Hour Monitoring Window

### Monitor 1: Audit Log Growth Rate

**Run every 15 minutes for 2 hours:**
```sql
SELECT 
  DATE_TRUNC('minute', created_at) as minute,
  COUNT(*) as events_per_minute,
  COUNT(*) FILTER (WHERE event_type = 'rate_limit_exceeded') as rate_limit_events
FROM security_audit_log
WHERE created_at > now() - interval '15 minutes'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minute DESC;
```

**Expected:** During synthetic attack, `rate_limit_events` should be ≤ (# of unique user+endpoint combos), not (# of total requests).

### Monitor 2: Connection Pool Health

```sql
-- Check active connections
SELECT 
  state,
  COUNT(*) as connection_count,
  MAX(now() - query_start) as max_query_duration
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY state;
```

**Expected:** 
- No connections in `idle in transaction` state for >5s
- `max_query_duration` < 10s
- Total connections < 50% of pool limit

### Monitor 3: Deduplication Effectiveness

```sql
-- Show how many duplicates were prevented (estimate)
SELECT 
  user_id,
  event_data->>'endpoint' as endpoint,
  COUNT(*) as unique_logs,
  -- If user was hitting rate limits constantly, we'd expect ~120 logs per hour
  -- But dedup limits to 60 (1 per minute)
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as span_minutes,
  ROUND(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60) as expected_without_dedup
FROM security_audit_log
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '2 hours'
GROUP BY user_id, event_data->>'endpoint'
HAVING COUNT(*) > 1;
```

**Expected:** `unique_logs` is much less than `expected_without_dedup` (deduplication working).

### Monitor 4: Error Rate Check

```sql
-- Check for unexpected errors in edge functions
SELECT 
  event_type,
  severity,
  COUNT(*) as error_count
FROM security_audit_log
WHERE severity IN ('error', 'critical')
  AND created_at > now() - interval '15 minutes'
GROUP BY event_type, severity
ORDER BY error_count DESC;
```

**Expected:** No new error types; error count similar to baseline.

---

## Acceptance Gate (Move to Phase 3 Only If ALL PASS)

### Criteria Checklist

- [ ] **Test 1 PASS:** 10 rapid requests → exactly 1 audit log
- [ ] **Test 2 PASS:** 2 endpoints → 2 separate audit logs
- [ ] **Test 3 PASS:** 2 users → 2 separate audit logs
- [ ] **Test 4 PASS:** Normal requests unaffected
- [ ] **Test 5 PASS:** No latency regression (≤200ms)
- [ ] **Monitor 1:** Audit log growth flat during attack (not exponential)
- [ ] **Monitor 2:** Connection pool stable, no timeouts
- [ ] **Monitor 3:** Deduplication effectiveness >80%
- [ ] **Monitor 4:** Error rate unchanged from baseline

### Quantitative Metrics

**Before Phase 2:**
- Rate limit events per hour (baseline): _______

**After Phase 2:**
- Rate limit events per hour (under attack): _______
- Reduction: _______ % (expect >90%)

---

## Rollback Trigger

Execute rollback if ANY of these occur:

- ❌ Legitimate rate limit events are missing from audit log
- ❌ Latency increased by >50ms
- ❌ Connection pool saturation (>80% utilized)
- ❌ Error rate increased by >20%
- ❌ Admin dashboard shows access failures

### Rollback Procedure

```sql
-- 1. Revert edge function to direct insert (requires code deploy)
-- Edit supabase/functions/validate-feature-access/index.ts:
-- Change:
await supabase.rpc('log_audit_event_deduplicated', { ... });
-- Back to:
await supabase.from('security_audit_log').insert({ ... });

-- 2. Database function remains in place (harmless if unused)
-- 3. Monitor for 24h to confirm rollback successful
```

---

## Phase 2 Completion Report

**Executed By:** _______________________  
**Date/Time:** _______________________  
**Environment:** Production

### Test Results

| Test | Result | Notes |
|------|--------|-------|
| Test 1: Single endpoint | ⬜ PASS ⬜ FAIL | log_count = ____ (expected 1) |
| Test 2: Multiple endpoints | ⬜ PASS ⬜ FAIL | 2 rows, each log_count = 1 |
| Test 3: Different users | ⬜ PASS ⬜ FAIL | 2 rows, each log_count = 1 |
| Test 4: Normal requests | ⬜ PASS ⬜ FAIL | 5 successful accesses |
| Test 5: Latency check | ⬜ PASS ⬜ FAIL | Response time = ____ms |

### Monitoring Results (2-hour window)

- Audit log growth: ⬜ Flat ⬜ Increasing
- Connection pool: ⬜ Stable ⬜ Saturated
- Deduplication effectiveness: _____%
- Error rate: ⬜ Baseline ⬜ Elevated

### Decision

- [ ] ✅ **ACCEPT & PROCEED TO PHASE 3** - All criteria met
- [ ] ⚠️ **ROLLBACK** - Issues detected (document below)
- [ ] 🟡 **INVESTIGATE** - Partial success, needs review

**Critical Issues (if any):** _______________________________________________

**Next Steps:** _______________________________________________

---

## Phase 3 Readiness

Once Phase 2 acceptance gate is met, proceed to Phase 3:
- **Scope:** Enable RLS on `public_features` and `public_pricing`
- **Goal:** Admin-only writes, public reads
- **See:** `docs/PHASE_3_EXECUTION_CHECKLIST.md` (to be created)

**Phase 2 Status:** 🟡 PENDING VALIDATION
