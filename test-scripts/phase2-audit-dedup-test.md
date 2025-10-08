# Phase 2: Audit Log Deduplication Test

## Objective
Verify that rate_limit_exceeded events are deduplicated within a 1-minute window per user/endpoint combination.

## Prerequisites
- Phase 1 indexes deployed
- `log_audit_event_deduplicated` function deployed
- `validate-feature-access` edge function updated to use the new function

---

## Test 1: Rapid Rate Limit Hits - Single Endpoint

**Setup:**
- Authenticate as a test user
- Target endpoint: `validate-feature-access` with feature `premium_feature`

**Steps:**
1. Trigger 10 rapid requests within 5 seconds that will hit rate limits
2. Wait 2 seconds
3. Query audit log for this user

**Expected Result:**
- Exactly **1** `rate_limit_exceeded` log entry for this endpoint
- All other request attempts should be silently deduplicated

**SQL Verification:**
```sql
SELECT 
  COUNT(*) as log_count,
  MIN(created_at) as first_logged,
  MAX(created_at) as last_logged,
  event_data->>'endpoint' as endpoint
FROM security_audit_log
WHERE user_id = '<test_user_id>'
  AND event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '2 minutes'
GROUP BY event_data->>'endpoint';
```

**Pass Criteria:** `log_count = 1`

---

## Test 2: Multiple Endpoints - Same User

**Setup:**
- Same authenticated user
- Test multiple features: `premium_feature`, `enterprise_feature`, `ai_chat`

**Steps:**
1. Trigger 5 rapid rate-limited requests to `premium_feature`
2. Trigger 5 rapid rate-limited requests to `enterprise_feature`
3. Trigger 5 rapid rate-limited requests to `ai_chat`
4. Query audit log

**Expected Result:**
- **3 total** `rate_limit_exceeded` entries (1 per endpoint)
- Endpoints are isolated in deduplication

**SQL Verification:**
```sql
SELECT 
  event_data->>'endpoint' as endpoint,
  COUNT(*) as log_count
FROM security_audit_log
WHERE user_id = '<test_user_id>'
  AND event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '2 minutes'
GROUP BY event_data->>'endpoint'
ORDER BY endpoint;
```

**Pass Criteria:** 3 rows, each with `log_count = 1`

---

## Test 3: Different Users - Same Endpoint

**Setup:**
- Two test users: user_a, user_b
- Same endpoint: `premium_feature`

**Steps:**
1. User A triggers 10 rapid rate-limited requests
2. User B triggers 10 rapid rate-limited requests
3. Query audit log for both users

**Expected Result:**
- **2 total** entries (1 for user_a, 1 for user_b)
- User separation is enforced

**SQL Verification:**
```sql
SELECT 
  user_id,
  COUNT(*) as log_count,
  event_data->>'endpoint' as endpoint
FROM security_audit_log
WHERE user_id IN ('<user_a_id>', '<user_b_id>')
  AND event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '2 minutes'
GROUP BY user_id, event_data->>'endpoint';
```

**Pass Criteria:** 2 rows total, each with `log_count = 1`

---

## Test 4: Window Expiration

**Setup:**
- Single user
- Single endpoint: `premium_feature`

**Steps:**
1. Trigger 5 rapid rate-limited requests at T=0s
2. Wait 65 seconds
3. Trigger 5 more rapid rate-limited requests at T=65s
4. Query audit log

**Expected Result:**
- **2 total** entries (one at T=0s, one at T=65s)
- Window properly expires after 60 seconds

**SQL Verification:**
```sql
SELECT 
  id,
  created_at,
  event_data->>'endpoint' as endpoint
FROM security_audit_log
WHERE user_id = '<test_user_id>'
  AND event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '3 minutes'
ORDER BY created_at;
```

**Pass Criteria:** 2 rows with timestamps ~65 seconds apart

---

## Test 5: Non-Rate-Limit Events (Control)

**Setup:**
- Same user
- Trigger non-rate-limited events (e.g., `feature_access_granted`)

**Steps:**
1. Make 10 successful feature access requests within allowed rate limits
2. Query audit log for `feature_access_granted` events

**Expected Result:**
- **10 entries** (deduplication only applies to `rate_limit_exceeded`)
- Other event types log normally

**SQL Verification:**
```sql
SELECT 
  COUNT(*) as log_count
FROM security_audit_log
WHERE user_id = '<test_user_id>'
  AND event_type = 'feature_access_granted'
  AND created_at > now() - interval '2 minutes';
```

**Pass Criteria:** `log_count = 10`

---

## Performance Test: Burst Pattern Monitoring

**Setup:**
- 100 concurrent users
- Each triggers 20 rapid rate-limited requests

**Steps:**
1. Simulate burst traffic using a load testing tool
2. Monitor audit table growth
3. Check query performance on indexed columns

**Expected Result:**
- Audit table grows by ~100 rows (not 2000)
- Index scan times remain < 10ms (verify with `EXPLAIN ANALYZE`)

**SQL Verification:**
```sql
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM security_audit_log
WHERE user_id = '<test_user_id>'
  AND event_type = 'rate_limit_exceeded'
  AND created_at > now() - interval '1 minute';
```

**Pass Criteria:** 
- Execution time < 10ms
- Uses index scan (not sequential scan)
- Audit table growth ≤ 110 rows

---

## Acceptance Checklist

- [ ] Test 1: Single endpoint dedup passes
- [ ] Test 2: Multiple endpoints isolated
- [ ] Test 3: Different users isolated
- [ ] Test 4: Window expiration works correctly
- [ ] Test 5: Non-rate-limit events unaffected
- [ ] Performance: Burst traffic handled efficiently
- [ ] No existing auth flows broken
- [ ] Staging deployment successful
- [ ] Production deployment off-peak completed

---

## Rollback Plan

If issues detected:

1. Revert edge function to direct insert:
```typescript
await supabase.from('security_audit_log').insert({ ... });
```

2. Keep the database function in place (no harm, just unused)

3. Monitor for 24h before deciding whether to remove the function

---

## Test Results Log

**Date:** _______________  
**Tester:** _______________  
**Environment:** [ ] Staging [ ] Production  

| Test | Result | Notes |
|------|--------|-------|
| Test 1 | ⬜ Pass ⬜ Fail | |
| Test 2 | ⬜ Pass ⬜ Fail | |
| Test 3 | ⬜ Pass ⬜ Fail | |
| Test 4 | ⬜ Pass ⬜ Fail | |
| Test 5 | ⬜ Pass ⬜ Fail | |
| Performance | ⬜ Pass ⬜ Fail | |

**Overall Status:** ⬜ GO ⬜ NO-GO  
**Critical Issues:** _______________________________________________
