# T10: Final Acceptance Gate

## Production Readiness Checklist

### ✅ 1. Auth: Preflight & CORS

**Requirement:** Preflight 204/200 with scoped ACAO/ACAM/ACAH, session cookie works cross-site.

#### Validation Steps
```bash
# Test OPTIONS preflight
curl -X OPTIONS "https://yrndifsbsmpvmpudglcc.supabase.co/auth/v1/token?grant_type=password" \
  -H "Origin: https://strideguide.lovable.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,apikey" \
  -i
```

**Expected Response:**
```
HTTP/2 204
access-control-allow-origin: https://strideguide.lovable.app
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
access-control-allow-headers: authorization, x-client-info, apikey, content-type
access-control-max-age: 86400
```

#### Browser Console Test
```javascript
// Test session cookie persistence
const testAuth = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password'
  });
  console.log('Session:', data.session);
  console.log('Cookie set:', document.cookie.includes('sb-'));
  
  // Reload page and check session persists
  setTimeout(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session after reload:', session ? 'VALID' : 'LOST');
    });
  }, 1000);
};
testAuth();
```

**Acceptance:**
- [ ] OPTIONS returns 204 with correct CORS headers
- [ ] Session cookie set with SameSite=Lax
- [ ] Session persists across page reloads
- [ ] No "Network error" on login

---

### ✅ 2. Checkout: Hosted Checkout Success

**Requirement:** Flag true in canary → hosted Checkout opens, test purchase succeeds, success URL reached.

#### Test Flow
1. **Enable flag:**
   ```json
   // public/config/runtime.json
   { "enablePayments": true, ... }
   ```

2. **Execute checkout:**
   - Click "Upgrade to Premium"
   - Redirected to Stripe Checkout
   - URL contains `checkout.stripe.com/c/pay/cs_test_...`

3. **Complete payment:**
   - Card: `4242 4242 4242 4242`
   - Expiry: 12/34, CVC: 123
   - Click "Pay"

4. **Verify success:**
   - Redirected to `https://strideguide.lovable.app/?session_id=cs_test_...`
   - Success toast: "Subscription activated"

#### Validation Queries
```sql
-- Verify checkout session created
SELECT idempotency_key, stripe_object_id, operation_type
FROM stripe_idempotency_log
WHERE operation_type = 'create_checkout'
AND user_id = '<USER_UUID>'
ORDER BY created_at DESC LIMIT 1;

-- Verify subscription active
SELECT status, stripe_subscription_id, plan_id
FROM user_subscriptions
WHERE user_id = '<USER_UUID>'
AND status = 'active';

-- Verify webhook processed
SELECT stripe_event_id, event_type, status
FROM billing_events
WHERE user_id = '<USER_UUID>'
AND event_type = 'invoice.payment_succeeded'
ORDER BY created_at DESC LIMIT 1;
```

**Acceptance:**
- [ ] Checkout session URL received in <2s
- [ ] Payment succeeds with test card
- [ ] Success URL redirect works
- [ ] Subscription status = 'active' in DB
- [ ] Webhook `customer.subscription.created` processed

---

### ✅ 3. Portal: Plan Change Reflected After Webhook

**Requirement:** Portal opens, plan change reflected after webhook.

#### Test Flow
1. **Open portal:**
   - Navigate to Settings → "Manage Subscription"
   - Click "Manage Billing"
   - Redirected to `billing.stripe.com/p/session/bps_...`

2. **Change plan:**
   - Click "Update Plan"
   - Select "Basic" (downgrade from Premium)
   - Confirm change

3. **Verify webhook:**
   - Wait max 30s for `customer.subscription.updated` webhook
   - Check DB for updated plan

#### Validation Queries
```sql
-- Check portal session created
SELECT stripe_object_id, operation_type
FROM stripe_idempotency_log
WHERE operation_type = 'create_portal'
AND user_id = '<USER_UUID>'
ORDER BY created_at DESC LIMIT 1;

-- Check subscription updated
SELECT 
  us.status, 
  sp.name as plan_name,
  us.updated_at
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = '<USER_UUID>'
ORDER BY us.updated_at DESC LIMIT 1;

-- Check webhook event
SELECT event_type, stripe_event_id
FROM billing_events
WHERE user_id = '<USER_UUID>'
AND event_type = 'customer.subscription.updated'
ORDER BY created_at DESC LIMIT 1;
```

**Acceptance:**
- [ ] Portal session URL received in <2s
- [ ] Portal loads with current plan displayed
- [ ] Plan change executed successfully
- [ ] Webhook updates subscription in DB within 30s
- [ ] App reflects new plan after refresh

---

### ✅ 4. Webhooks: Signature Verification & Idempotency

**Requirement:** Valid signature → 200; invalid → 400; duplicate events deduped; subscription status updated.

#### Test 4a: Valid Signature
```bash
# Use Stripe CLI to send real webhook
stripe trigger customer.subscription.created \
  --add customer:metadata[user_id]=<USER_UUID>
```

**Expected:**
- ✅ Edge function returns 200
- ✅ Event inserted into `billing_events`
- ✅ Subscription created in `user_subscriptions`
- ✅ Security audit log entry

**Validation:**
```sql
SELECT * FROM billing_events 
WHERE stripe_event_id = '<EVENT_ID>' LIMIT 1;
```

#### Test 4b: Invalid Signature
```bash
curl -X POST "https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/stripe-webhook" \
  -H "stripe-signature: t=1234,v1=fake_signature" \
  -d '{"id": "evt_invalid", "type": "test"}'
```

**Expected:**
- ✅ Returns 400 Bad Request
- ✅ Security audit log: `webhook_signature_failed`
- ✅ No DB changes

#### Test 4c: Duplicate Event
```bash
# Send same event twice (same event.id)
stripe trigger customer.subscription.created \
  --add customer:metadata[user_id]=<USER_UUID>

# Wait 2 seconds, trigger again (Stripe will retry with same ID)
```

**Expected:**
- ✅ First: 200, event processed
- ✅ Second: 200, idempotent (no duplicate insert)
- ✅ Only ONE row in `billing_events` for this event ID

**Validation:**
```sql
SELECT stripe_event_id, COUNT(*) 
FROM billing_events
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

**Acceptance:**
- [ ] Valid signature → 200, event processed
- [ ] Invalid signature → 400, no DB changes
- [ ] Duplicate event → 200, idempotent (no duplicates)
- [ ] Subscription status updated correctly

---

### ✅ 5. Telemetry: P95 + Error Rate Visible

**Requirement:** P95 + error rate visible for Start Guidance, Find Item, Settings save, Checkout open, Portal open.

#### Query P95 Latency
```sql
SELECT 
  metric_name,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) AS p95_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) AS p50_ms,
  COUNT(*) AS sample_count
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND metric_name IN (
    'guidance_start_time',
    'find_item_detection',
    'settings_save_time',
    'checkout_creation',
    'portal_creation'
  )
GROUP BY metric_name;
```

**Expected Thresholds:**
| Metric | P95 Target |
|--------|-----------|
| guidance_start_time | <3000ms |
| find_item_detection | <500ms |
| settings_save_time | <800ms |
| checkout_creation | <2000ms |
| portal_creation | <2000ms |

#### Query Error Rates
```sql
SELECT 
  journey_name,
  COUNT(*) AS total_attempts,
  COUNT(*) FILTER (WHERE status = 'error') AS error_count,
  ROUND((COUNT(*) FILTER (WHERE status = 'error')::NUMERIC / COUNT(*)) * 100, 2) AS error_rate_pct
FROM journey_traces
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND journey_name IN (
    'start_guidance',
    'find_item',
    'settings_save',
    'checkout_flow',
    'portal_access'
  )
GROUP BY journey_name;
```

**Expected Thresholds:**
| Journey | Max Error Rate |
|---------|---------------|
| start_guidance | <5% |
| find_item | <8% |
| settings_save | <2% |
| checkout_flow | <1% |
| portal_access | <1% |

**Acceptance:**
- [ ] P95 data queryable for all 5 journeys
- [ ] Error rates queryable for all 5 journeys
- [ ] Metrics captured with correlation IDs
- [ ] Flag states logged in event_data

---

### ✅ 6. Rollout: Canary Smoke + Rollback

**Requirement:** Canary smoke passes; flip flags to true for prod; rollback rehearsed.

#### Canary Rollout
1. **Deploy canary config:**
   ```bash
   cp public/config/runtime-canary.json public/config/runtime.json
   git commit -m "Canary: Enable payments & webhooks"
   git push
   ```

2. **Run smoke tests** (see T8_canary_rollout.md):
   - Start Guidance: ✅
   - Find Item: ✅
   - Settings Save: ✅
   - Checkout Flow: ✅
   - Portal Access: ✅

3. **Capture metrics snapshot:**
   - P95 latency: PASS
   - Error rates: PASS
   - No critical issues

4. **Promote to production:**
   ```bash
   # Update runtime.json with production config
   cat > public/config/runtime.json << EOF
   {
     "enablePayments": true,
     "enableWebhooks": true,
     "version": "1.1.0",
     "environment": "production"
   }
   EOF
   git commit -m "🚀 Production: Enable payments & webhooks"
   git push
   ```

#### Rollback Rehearsal
```bash
# Emergency rollback (instant)
cat > public/config/runtime.json << EOF
{
  "enablePayments": false,
  "enableWebhooks": false,
  "version": "1.0.0",
  "environment": "production-safe"
}
EOF
git commit -m "🔥 ROLLBACK: Disable flags"
git push
```

**Rollback SLA:** <5 minutes from detection to flags disabled

**Acceptance:**
- [ ] Canary smoke tests all pass
- [ ] Metrics snapshot captured
- [ ] Production flags enabled successfully
- [ ] Rollback rehearsed (timed at <5 min)
- [ ] No code changes required for rollback

---

## Final Acceptance Criteria Summary

### System-Wide Requirements

#### ✅ Security
- [ ] All RLS policies enabled on user tables
- [ ] No client-side secrets in code
- [ ] Webhook signatures verified
- [ ] Emergency data encrypted at rest
- [ ] No PII in logs

#### ✅ Accessibility
- [ ] VoiceOver/TalkBack full navigation
- [ ] High contrast mode functional
- [ ] Large text mode (1.5x scaling)
- [ ] Touch targets ≥52dp/pt
- [ ] No autoplay audio with sound

#### ✅ Performance
- [ ] Offline mode: core features work (guidance, find item, SOS)
- [ ] Battery: ≥2.5h continuous guidance @ 50% brightness
- [ ] ML inference: ≤120ms/frame on Pixel 6 / iPhone 12
- [ ] P95 latency: guidance <3s, checkout <2s, portal <2s

#### ✅ Reliability
- [ ] Error rate <5% for critical journeys
- [ ] SOS: 100% SMS delivery (cell-only)
- [ ] No data loss on crash
- [ ] Idempotent payment operations

#### ✅ Observability
- [ ] Telemetry opt-in functional
- [ ] P95/error rate queryable for all critical journeys
- [ ] Security audit log captures auth/payment events
- [ ] Edge function logs retained 7 days

#### ✅ Compliance
- [ ] PIPEDA consent text displayed
- [ ] Privacy policy linked on landing page
- [ ] Terms of service linked on signup
- [ ] User can delete account (GDPR/PIPEDA)

#### ✅ Deployment
- [ ] Feature flags control payments/webhooks
- [ ] Canary rollout rehearsed
- [ ] Rollback procedure tested (<5 min)
- [ ] Production config documented

---

## Gate Status

| Requirement | Status | Evidence | Sign-Off |
|-------------|--------|----------|----------|
| 1. Auth Preflight | ⏳ | - | - |
| 2. Checkout Success | ⏳ | - | - |
| 3. Portal + Webhook | ⏳ | - | - |
| 4. Webhook Security | ⏳ | - | - |
| 5. Telemetry Visible | ⏳ | - | - |
| 6. Canary + Rollback | ⏳ | - | - |

---

## Final Sign-Off

**Product Owner:** _____________________ Date: _______

**QA Lead:** _____________________ Date: _______

**Security Review:** _____________________ Date: _______

**Deployment Approved:** ☐ YES  ☐ NO

**Go-Live Date:** _______________________

**Conditions (if any):**
- [ ] None
- [ ] <list blocking issues>

---

## Post-Launch Monitoring (First 24h)

```sql
-- Monitor error rates
SELECT 
  journey_name,
  COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*) as error_pct
FROM journey_traces
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY journey_name;

-- Monitor P95 latency
SELECT 
  metric_name,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) AS p95_ms
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY metric_name;

-- Monitor subscription health
SELECT 
  status,
  COUNT(*) as subscription_count
FROM user_subscriptions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Monitor webhook processing
SELECT 
  event_type,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE status = 'succeeded') as success_count
FROM billing_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

**Alert Thresholds:**
- Error rate spike >10%: Investigate immediately
- P95 degradation >50%: Check infrastructure
- Failed webhooks >5%: Review signature validation
- Failed payments >5%: Check Stripe dashboard
