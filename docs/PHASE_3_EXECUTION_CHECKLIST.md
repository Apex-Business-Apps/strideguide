# Phase 3: Admin-Only Writes on Public Tables - Execution Checklist

**Status:** 🟡 READY TO EXECUTE  
**Deployment Window:** Off-Peak (2-4 AM recommended)  
**Expected Duration:** 1-2 hours (including monitoring)  
**Risk Level:** Medium (RLS changes, requires careful validation)

---

## Pre-Flight Checklist

### 1. Verify Phase 2 Acceptance Complete
```sql
-- Confirm deduplication function exists and is working
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'log_audit_event_deduplicated';
```

**Expected:** 1 row showing the function exists.

### 2. Verify Admin Helper Function
```sql
-- Test that is_admin() helper works
SELECT public.is_admin(auth.uid());
```

**Expected:** Returns `true` for at least one admin user.

**Critical:** If no admin exists, create one first using the existing `assign_admin_role` function:
```sql
SELECT public.assign_admin_role('<user_id>', 'admin');
```

### 3. Document Current State
```sql
-- Check current RLS status on target tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('public_features', 'public_pricing');
```

**Expected:** Both tables show `rls_enabled = false` (current state).

### 4. Backup Current Policies (if any)
```sql
-- Export current policies (should be none, but document)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('public_features', 'public_pricing');
```

**Document:** Save output for rollback reference.

---

## Phase 3 Migration SQL

**Migration File:** `supabase/migrations/[timestamp]_phase3_admin_only_writes.sql`

```sql
-- ============================================================================
-- Phase 3: Admin-Only Writes on Public Tables
-- ============================================================================
-- Scope: public_features, public_pricing
-- Goal: Enable RLS with admin-only writes; public reads unchanged
-- ============================================================================

-- 1. Enable RLS on target tables
ALTER TABLE public.public_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_pricing ENABLE ROW LEVEL SECURITY;

-- 2. Public Features: Read policies (everyone can read enabled features)
CREATE POLICY "Anyone can view public features"
  ON public.public_features
  FOR SELECT
  USING (true);

-- 3. Public Features: Write policies (admin-only)
CREATE POLICY "Only admins can insert public features"
  ON public.public_features
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update public features"
  ON public.public_features
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete public features"
  ON public.public_features
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. Public Pricing: Read policies (everyone can read active pricing)
CREATE POLICY "Anyone can view public pricing"
  ON public.public_pricing
  FOR SELECT
  USING (true);

-- 5. Public Pricing: Write policies (admin-only)
CREATE POLICY "Only admins can insert public pricing"
  ON public.public_pricing
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update public pricing"
  ON public.public_pricing
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete public pricing"
  ON public.public_pricing
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6. Audit log for RLS activation
INSERT INTO public.security_audit_log (
  user_id,
  event_type,
  severity,
  event_data
) VALUES (
  NULL, -- System event
  'rls_enabled_admin_writes',
  'info',
  jsonb_build_object(
    'tables', ARRAY['public_features', 'public_pricing'],
    'phase', 'phase_3_admin_writes'
  )
);
```

---

## Deployment Steps

### Step 1: Create Migration
1. Copy the SQL above into a new migration file
2. Review for syntax errors
3. Test in local/staging environment first

### Step 2: Deploy to Staging
```bash
# Deploy migration to staging
supabase db push --staging
```

### Step 3: Verify Migration Applied
```sql
-- Confirm RLS is now enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('public_features', 'public_pricing');

-- Expected: Both tables show rls_enabled = true

-- Confirm policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('public_features', 'public_pricing')
ORDER BY tablename, cmd;

-- Expected: 6 policies per table (3 for features, 3 for pricing)
```

### Step 4: Deploy to Production
**Timing:** Off-peak window (2-4 AM)

```bash
# Deploy to production
supabase db push --production
```

**Status:** 🟡 PENDING DEPLOYMENT

---

## Smoke Tests (Execute Immediately After Deployment)

### Test 1: Admin User - INSERT (Public Features)

**Setup:** Authenticate as admin user

**Execute:**
```sql
-- As admin, insert a new feature
INSERT INTO public.public_features (name, description, is_enabled)
VALUES ('test_admin_feature', 'Test feature created by admin', true);
```

**Verify:**
```sql
SELECT * FROM public.public_features WHERE name = 'test_admin_feature';
```

**PASS CRITERIA:** Insert succeeds; row visible in SELECT.

---

### Test 2: Admin User - UPDATE (Public Features)

**Execute:**
```sql
-- As admin, update the test feature
UPDATE public.public_features
SET description = 'Updated by admin'
WHERE name = 'test_admin_feature';
```

**Verify:**
```sql
SELECT description FROM public.public_features WHERE name = 'test_admin_feature';
```

**PASS CRITERIA:** Update succeeds; description changed.

---

### Test 3: Admin User - DELETE (Public Features)

**Execute:**
```sql
-- As admin, delete the test feature
DELETE FROM public.public_features WHERE name = 'test_admin_feature';
```

**Verify:**
```sql
SELECT COUNT(*) FROM public.public_features WHERE name = 'test_admin_feature';
```

**PASS CRITERIA:** Delete succeeds; row count = 0.

---

### Test 4: Non-Admin User - INSERT (Should FAIL)

**Setup:** Authenticate as non-admin user (no admin role)

**Execute:**
```sql
-- As non-admin, attempt to insert
INSERT INTO public.public_features (name, description, is_enabled)
VALUES ('unauthorized_feature', 'Should fail', true);
```

**Expected Error:**
```
new row violates row-level security policy for table "public_features"
```

**PASS CRITERIA:** Insert blocked with RLS error.

---

### Test 5: Non-Admin User - UPDATE (Should FAIL)

**Setup:** Authenticate as non-admin user

**Execute:**
```sql
-- As non-admin, attempt to update existing row
UPDATE public.public_features
SET description = 'Unauthorized update'
WHERE name = 'some_existing_feature';
```

**Expected Error:**
```
new row violates row-level security policy for table "public_features"
```

**PASS CRITERIA:** Update blocked with RLS error.

---

### Test 6: Non-Admin User - DELETE (Should FAIL)

**Execute:**
```sql
-- As non-admin, attempt to delete
DELETE FROM public.public_features WHERE name = 'some_existing_feature';
```

**Expected Error:**
```
new row violates row-level security policy for table "public_features"
```

**PASS CRITERIA:** Delete blocked with RLS error.

---

### Test 7: Public/Anonymous - SELECT (Should SUCCEED)

**Setup:** Unauthenticated request (anonymous)

**Execute:**
```typescript
// From client-side (no auth token)
const { data, error } = await supabase
  .from('public_features')
  .select('*');

console.log(data, error);
```

**PASS CRITERIA:** SELECT succeeds; returns all rows; no error.

---

### Test 8: Admin User - Public Pricing (Full CRUD)

**Execute:**
```sql
-- INSERT
INSERT INTO public.public_pricing (name, price_monthly, is_active)
VALUES ('test_plan', 9.99, true);

-- UPDATE
UPDATE public.public_pricing SET price_monthly = 12.99 WHERE name = 'test_plan';

-- SELECT
SELECT * FROM public.public_pricing WHERE name = 'test_plan';

-- DELETE
DELETE FROM public.public_pricing WHERE name = 'test_plan';
```

**PASS CRITERIA:** All operations succeed without error.

---

### Test 9: Non-Admin User - Public Pricing (Writes Should FAIL)

**Execute:**
```sql
-- As non-admin, attempt INSERT
INSERT INTO public.public_pricing (name, price_monthly, is_active)
VALUES ('unauthorized_plan', 99.99, true);
```

**Expected Error:** RLS policy violation

**PASS CRITERIA:** Write blocked; read still works.

---

### Test 10: Admin Dashboard Flows

**Execute via UI:**
1. Navigate to admin dashboard (if exists)
2. Create a new feature/pricing entry
3. Update an existing entry
4. Delete a test entry

**PASS CRITERIA:** All UI flows complete successfully; no console errors.

---

## 24-Hour Monitoring Window

### Monitor 1: Write Error Rate (Non-Admin Attempts)

**Run every 6 hours for 24h:**
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as blocked_write_attempts
FROM security_audit_log
WHERE event_type LIKE '%rls_violation%'
  AND created_at > now() - interval '6 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

**Expected:** Low count (only unauthorized attempts); no legitimate admin failures.

### Monitor 2: Admin Write Success Rate

**Run every 6 hours for 24h:**
```sql
-- Check for admin write failures (should be near zero)
SELECT 
  user_id,
  event_type,
  severity,
  event_data
FROM security_audit_log
WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role IN ('admin', 'super-admin')
)
  AND severity IN ('error', 'critical')
  AND created_at > now() - interval '6 hours'
ORDER BY created_at DESC;
```

**Expected:** Zero admin write failures.

### Monitor 3: Public Read Performance

**Execute:**
```sql
EXPLAIN ANALYZE
SELECT * FROM public.public_features WHERE is_enabled = true;

EXPLAIN ANALYZE
SELECT * FROM public.public_pricing WHERE is_active = true;
```

**Expected:** 
- Query time < 50ms
- Uses index scans (not sequential)
- No performance regression vs pre-RLS baseline

### Monitor 4: Connection Pool Health

```sql
SELECT 
  state,
  COUNT(*) as connection_count,
  MAX(now() - state_change) as max_age
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY state;
```

**Expected:**
- No connections in `idle in transaction` > 10s
- Total connections < 60% of pool limit

---

## Acceptance Gate (All Must Pass to Proceed)

### Criteria Checklist

- [ ] **Test 1-3 PASS:** Admin writes (INSERT/UPDATE/DELETE) succeed on both tables
- [ ] **Test 4-6 PASS:** Non-admin writes blocked with RLS error
- [ ] **Test 7 PASS:** Public reads work (anonymous SELECT succeeds)
- [ ] **Test 8 PASS:** Admin full CRUD on public_pricing succeeds
- [ ] **Test 9 PASS:** Non-admin writes to public_pricing blocked
- [ ] **Test 10 PASS:** Admin UI flows complete without errors
- [ ] **Monitor 1:** No unexpected RLS violations; blocked attempts = non-admin only
- [ ] **Monitor 2:** Admin write success rate ≥ 99%
- [ ] **Monitor 3:** Public read performance unchanged (< 50ms)
- [ ] **Monitor 4:** Connection pool stable, no timeouts

### Quantitative Metrics

**Before Phase 3:**
- Public reads baseline latency (p95): _______ ms
- Admin write baseline (if measurable): _______ ms

**After Phase 3:**
- Public reads latency (p95): _______ ms (expect < 10% change)
- Admin writes latency (p95): _______ ms
- Non-admin write block rate: _______ % (expect 100%)

---

## Rollback Trigger

Execute rollback if ANY of these occur:

- ❌ Admin writes fail unexpectedly (RLS blocking legitimate admins)
- ❌ Public reads broken (anonymous users cannot SELECT)
- ❌ Performance degradation > 20% on read queries
- ❌ Connection pool saturation (>80% utilized)
- ❌ Admin UI showing errors on write operations

### Rollback Procedure

```sql
-- 1. Disable RLS on both tables (immediate revert)
ALTER TABLE public.public_features DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_pricing DISABLE ROW LEVEL SECURITY;

-- 2. Drop the policies (cleanup)
DROP POLICY IF EXISTS "Anyone can view public features" ON public.public_features;
DROP POLICY IF EXISTS "Only admins can insert public features" ON public.public_features;
DROP POLICY IF EXISTS "Only admins can update public features" ON public.public_features;
DROP POLICY IF EXISTS "Only admins can delete public features" ON public.public_features;

DROP POLICY IF EXISTS "Anyone can view public pricing" ON public.public_pricing;
DROP POLICY IF EXISTS "Only admins can insert public pricing" ON public.public_pricing;
DROP POLICY IF EXISTS "Only admins can update public pricing" ON public.public_pricing;
DROP POLICY IF EXISTS "Only admins can delete public pricing" ON public.public_pricing;

-- 3. Verify rollback
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('public_features', 'public_pricing');

-- Expected: Both tables show rowsecurity = false

-- 4. Log rollback event
INSERT INTO public.security_audit_log (
  user_id,
  event_type,
  severity,
  event_data
) VALUES (
  NULL,
  'rls_rollback_phase3',
  'warn',
  jsonb_build_object('reason', 'Phase 3 acceptance failed', 'timestamp', now())
);
```

**Post-Rollback Validation:**
- Re-run smoke tests to confirm tables writable without RLS
- Check application logs for residual errors
- Document incident in Phase 3 report

---

## Phase 3 Completion Report

**Executed By:** _______________________  
**Date/Time:** _______________________  
**Environment:** Production

### Test Results

| Test | Result | Notes |
|------|--------|-------|
| Test 1: Admin INSERT | ⬜ PASS ⬜ FAIL | |
| Test 2: Admin UPDATE | ⬜ PASS ⬜ FAIL | |
| Test 3: Admin DELETE | ⬜ PASS ⬜ FAIL | |
| Test 4: Non-admin INSERT blocked | ⬜ PASS ⬜ FAIL | Error message: ______ |
| Test 5: Non-admin UPDATE blocked | ⬜ PASS ⬜ FAIL | Error message: ______ |
| Test 6: Non-admin DELETE blocked | ⬜ PASS ⬜ FAIL | Error message: ______ |
| Test 7: Public SELECT works | ⬜ PASS ⬜ FAIL | |
| Test 8: Admin CRUD on pricing | ⬜ PASS ⬜ FAIL | |
| Test 9: Non-admin pricing blocked | ⬜ PASS ⬜ FAIL | |
| Test 10: Admin UI flows | ⬜ PASS ⬜ FAIL | |

### Monitoring Results (24-hour window)

- **Non-admin write attempts blocked:** _______ (expected: 100%)
- **Admin write success rate:** _______ % (expected: ≥ 99%)
- **Public read latency (p95):** _______ ms (expected: < 10% change)
- **Connection pool health:** ⬜ Stable ⬜ Saturated
- **RLS violations:** _______ (expected: only non-admin attempts)

### Decision

- [ ] ✅ **ACCEPT & PROCEED TO PHASE 4** - All criteria met
- [ ] ⚠️ **ROLLBACK** - Issues detected (document below)
- [ ] 🟡 **INVESTIGATE** - Partial success, needs review

**Critical Issues (if any):** _______________________________________________

**Next Steps:** _______________________________________________

---

## Post-Acceptance Actions

Once Phase 3 acceptance gate is met:

1. **Update Admin UI:**
   - Change AdminSetup from read-only to functional (admins only)
   - Ensure non-admins see "Contact admin" message

2. **Update Documentation:**
   - CHANGELOG entry: "Phase 3 complete - Admin-only writes enforced"
   - Update PHASE_1_MIGRATION_GUIDE.md with Phase 3 results

3. **Team Communication:**
   - Notify team of Phase 3 acceptance
   - Share monitoring dashboard links
   - Announce readiness for Phase 4

4. **Prepare for Phase 4:**
   - Review Phase 4 scope (Admin Assignment Lock-In)
   - Schedule deployment window (business hours acceptable)
   - Brief team on first-admin path security

---

## Phase 4 Readiness

**Scope:** Admin Assignment Lock-In
- Once ≥ 1 admin exists, only admins can grant roles
- Self-assignment blocked for non-admins
- AdminSetup UI shows helper for non-admins

**Prerequisites:**
- Phase 3 acceptance complete
- At least one admin verified in production
- Admin UI tested and functional

**See:** `docs/PHASE_4_EXECUTION_CHECKLIST.md` (to be created)

**Phase 3 Status:** 🟡 PENDING VALIDATION
