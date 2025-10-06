# T8: Canary Rollout & Smoke Tests

## Objective
Deploy with feature flags enabled on canary environment, run smoke tests, capture metrics (error rate, p95 latency).

---

## Phase 1: Canary Configuration

### Step 1: Deploy Canary Config
```bash
# Replace runtime.json with canary version
cp public/config/runtime-canary.json public/config/runtime.json

# Verify flags
curl https://yourapp.lovable.app/config/runtime.json
```

**Expected Response:**
```json
{
  "enablePayments": true,
  "enableNewAuth": false,
  "enableWebhooks": true,
  "version": "1.1.0-canary",
  "environment": "canary"
}
```

### Step 2: Verify Flag Loading
Open browser console on your app:
```javascript
// Check flags loaded correctly
const checkFlags = async () => {
  const response = await fetch('/config/runtime.json');
  const flags = await response.json();
  console.log('Canary Flags:', flags);
  console.log('Payments Enabled:', flags.enablePayments);
  console.log('Webhooks Enabled:', flags.enableWebhooks);
};
checkFlags();
```

---

## Phase 2: Smoke Tests

### Test 1: Start Guidance Journey
**User Action:** Click "Start Guidance" button

**Browser Console Check:**
```javascript
// Monitor telemetry events
window.addEventListener('telemetry-event', (e) => {
  console.log('[Telemetry]', e.detail);
});
```

**Expected Logs:**
- `journey_started: { journey: 'guidance', timestamp: ... }`
- Camera permission request
- ML model loading (if applicable)
- Audio guidance initialization

**Success Criteria:**
- ✅ Guidance starts within 3 seconds
- ✅ No console errors
- ✅ Telemetry event captured

---

### Test 2: Find Item Journey
**User Action:** Navigate to "Find Item" feature

**Expected Behavior:**
- ✅ Camera activates
- ✅ Object detection runs
- ✅ Audio feedback on item detection
- ✅ No crashes or freezes

**Validation Query:**
```sql
SELECT journey_name, status, duration_ms, created_at
FROM journey_traces
WHERE journey_name = 'find_item'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

---

### Test 3: Settings Save Journey
**User Action:** 
1. Go to Settings
2. Change voice speed to 1.2
3. Toggle high contrast mode
4. Save settings

**Expected:**
- ✅ Settings persist after page reload
- ✅ Changes reflected immediately in UI

**Validation Query:**
```sql
SELECT voice_speed, high_contrast_mode, updated_at
FROM user_settings
WHERE user_id = auth.uid();
```

---

### Test 4: Checkout Flow (Payments Enabled)
**User Action:** Click "Upgrade to Premium"

**Expected:**
- ✅ Pricing modal appears
- ✅ Stripe Checkout Session created
- ✅ Redirect to Stripe Checkout
- ✅ URL contains `checkout.stripe.com/c/pay/cs_test_...`

**Validation:**
```sql
SELECT operation_type, stripe_object_id, created_at
FROM stripe_idempotency_log
WHERE operation_type = 'create_checkout'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC LIMIT 1;
```

**Success Criteria:**
- ✅ Checkout session created in <2 seconds
- ✅ No rate limit errors
- ✅ Idempotency key logged

---

### Test 5: Billing Portal Access
**User Action:** Click "Manage Subscription" (for users with active subscription)

**Expected:**
- ✅ Portal Session created
- ✅ Redirect to Stripe Billing Portal
- ✅ URL contains `billing.stripe.com/p/session/...`

**Validation:**
```sql
SELECT operation_type, stripe_object_id, created_at
FROM stripe_idempotency_log
WHERE operation_type = 'create_portal'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC LIMIT 1;
```

---

## Phase 3: Metrics Collection

### Performance Metrics (P95 Latency)

**Query P95 Response Times:**
```sql
SELECT 
  metric_name,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) AS p95_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) AS p50_ms,
  AVG(value) AS avg_ms,
  MAX(value) AS max_ms,
  COUNT(*) AS sample_count
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY metric_name
ORDER BY p95_ms DESC;
```

**Expected Thresholds:**
| Metric | P95 Target | P50 Target |
|--------|-----------|-----------|
| guidance_start_time | <3000ms | <1500ms |
| find_item_detection | <500ms | <250ms |
| settings_save_time | <800ms | <400ms |
| checkout_creation | <2000ms | <1000ms |
| portal_creation | <2000ms | <1000ms |

---

### Error Rate Analysis

**Query Error Rates by Journey:**
```sql
WITH journey_stats AS (
  SELECT 
    journey_name,
    COUNT(*) AS total_attempts,
    COUNT(*) FILTER (WHERE status = 'error') AS error_count,
    COUNT(*) FILTER (WHERE status = 'success') AS success_count
  FROM journey_traces
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY journey_name
)
SELECT 
  journey_name,
  total_attempts,
  error_count,
  success_count,
  ROUND((error_count::NUMERIC / NULLIF(total_attempts, 0)) * 100, 2) AS error_rate_pct
FROM journey_stats
ORDER BY error_rate_pct DESC;
```

**Acceptable Error Rates:**
- ✅ Start Guidance: <5%
- ✅ Find Item: <8% (camera/permission issues expected)
- ✅ Settings Save: <2%
- ✅ Checkout Creation: <1%
- ✅ Portal Access: <1%

---

### Telemetry Event Summary

**Query Recent Telemetry Events:**
```sql
SELECT 
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS unique_sessions,
  AVG((event_data->>'duration_ms')::int) AS avg_duration_ms
FROM usage_analytics
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY event_count DESC;
```

**Expected Events:**
- `journey_started`
- `journey_completed`
- `journey_error`
- `checkout_opened`
- `portal_opened`
- `settings_saved`

---

## Phase 4: Canary Health Report

### Metrics Snapshot Template

```markdown
## Canary Smoke Test Report
**Date:** YYYY-MM-DD HH:MM UTC
**Environment:** Canary (flags enabled)
**Duration:** 1 hour
**Test User:** <user_id>

### Performance (P95 Latency)
- Start Guidance: XXX ms ✅/❌
- Find Item: XXX ms ✅/❌
- Settings Save: XXX ms ✅/❌
- Checkout Creation: XXX ms ✅/❌
- Portal Access: XXX ms ✅/❌

### Error Rates
- Start Guidance: X.X% ✅/❌
- Find Item: X.X% ✅/❌
- Settings Save: X.X% ✅/❌
- Checkout: X.X% ✅/❌
- Portal: X.X% ✅/❌

### Critical Issues
- [ ] None
- [ ] <describe issue>

### Decision
- [ ] ✅ Promote to Production (flip flags true)
- [ ] ❌ Rollback (flip flags false)
- [ ] 🟡 Fix & Re-test
```

---

## Phase 5: Production Rollout

### Promote to Production
```bash
# If canary smoke passes, enable for all users
# Update runtime.json with production config
cat > public/config/runtime.json << EOF
{
  "enablePayments": true,
  "enableNewAuth": false,
  "enableWebhooks": true,
  "version": "1.1.0",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "production"
}
EOF

# Commit and deploy
git add public/config/runtime.json
git commit -m "🚀 Enable payments & webhooks in production"
git push
```

---

## Rollback Procedure

### Emergency Rollback (Instant)
```bash
# Disable all flags immediately
cat > public/config/runtime.json << EOF
{
  "enablePayments": false,
  "enableNewAuth": false,
  "enableWebhooks": false,
  "version": "1.0.0",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "production-safe"
}
EOF

# Deploy immediately
git add public/config/runtime.json
git commit -m "🔥 ROLLBACK: Disable payment flags"
git push
```

**No code changes required** - flags update takes effect on next page load.

---

## Acceptance Criteria

### ✅ Canary Deployment
- [ ] Canary config deployed with flags enabled
- [ ] Flag state verified in browser
- [ ] All smoke tests executed

### ✅ Performance
- [ ] P95 latency within thresholds for all journeys
- [ ] No performance degradation vs. baseline

### ✅ Error Rates
- [ ] Error rates <5% for critical journeys
- [ ] No new error patterns introduced

### ✅ Rollout Process
- [ ] Canary → Production promotion documented
- [ ] Rollback procedure tested
- [ ] Metrics snapshot captured

---

## Test Execution Log

| Test | Status | P95 (ms) | Error Rate | Tester | Date |
|------|--------|----------|------------|--------|------|
| Start Guidance | ⏳ | - | - | - | - |
| Find Item | ⏳ | - | - | - | - |
| Settings Save | ⏳ | - | - | - | - |
| Checkout Flow | ⏳ | - | - | - | - |
| Portal Access | ⏳ | - | - | - | - |
