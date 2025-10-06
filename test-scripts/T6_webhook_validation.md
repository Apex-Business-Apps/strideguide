# T6: Webhook Security & Idempotency Validation

## Objective
Verify Stripe webhook signature validation, idempotency handling, and subscription state updates.

---

## Test 1: Valid Webhook Signature

### Setup
```bash
# Get your webhook signing secret from Stripe Dashboard
WEBHOOK_SECRET="whsec_..."
SUPABASE_URL="https://yrndifsbsmpvmpudglcc.supabase.co"
```

### Simulate Valid Webhook
```bash
# Create a test event payload
EVENT_PAYLOAD='{
  "id": "evt_test_valid_001",
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_test123",
      "customer": "cus_test123",
      "status": "active",
      "items": {
        "data": [{
          "price": {
            "id": "price_premium_monthly"
          }
        }]
      },
      "current_period_start": 1704067200,
      "current_period_end": 1706745600
    }
  }
}'

# Generate valid signature (use Stripe CLI)
stripe trigger customer.subscription.created --add customer:metadata[user_id]=<USER_UUID>

# Or use Stripe CLI to forward webhooks
stripe listen --forward-to ${SUPABASE_URL}/functions/v1/stripe-webhook
```

### Expected Behavior
- ✅ Webhook returns **200 OK**
- ✅ Event inserted into `billing_events` table
- ✅ Subscription upserted in `user_subscriptions` table
- ✅ Security audit log entry created

### Validation Query
```sql
-- Check event was recorded
SELECT * FROM billing_events 
WHERE stripe_event_id = 'evt_test_valid_001'
ORDER BY created_at DESC LIMIT 1;

-- Check subscription was created/updated
SELECT * FROM user_subscriptions 
WHERE stripe_subscription_id = 'sub_test123';

-- Check security audit
SELECT * FROM security_audit_log 
WHERE event_type = 'webhook_received'
AND event_data->>'event_id' = 'evt_test_valid_001'
ORDER BY created_at DESC LIMIT 1;
```

---

## Test 2: Invalid Webhook Signature

### Simulate Invalid Signature
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1704067200,v1=invalid_signature_here" \
  -d '{
    "id": "evt_test_invalid_001",
    "type": "customer.subscription.created",
    "data": {"object": {}}
  }'
```

### Expected Behavior
- ✅ Webhook returns **400 Bad Request**
- ✅ Response body: `{"error": "Invalid signature"}`
- ✅ Security audit log entry with `webhook_signature_failed`
- ✅ NO database changes (no billing event, no subscription update)

### Validation Query
```sql
-- Verify no billing event was created
SELECT COUNT(*) FROM billing_events 
WHERE stripe_event_id = 'evt_test_invalid_001';
-- Expected: 0

-- Check security audit for failed signature
SELECT * FROM security_audit_log 
WHERE event_type = 'webhook_signature_failed'
AND severity = 'warning'
ORDER BY created_at DESC LIMIT 1;
```

---

## Test 3: Duplicate Event (Idempotency)

### Simulate Duplicate Webhook
```bash
# Send the same event twice using Stripe CLI
stripe trigger customer.subscription.created \
  --add customer:metadata[user_id]=<USER_UUID>

# Wait 2 seconds, then trigger again with same event ID
# (Stripe will retry with same event.id)
```

### Expected Behavior
- ✅ First webhook: **200 OK**, event processed
- ✅ Second webhook: **200 OK**, idempotent (no duplicate insert)
- ✅ Only ONE row in `billing_events` for this event ID
- ✅ Only ONE subscription record (upserted, not duplicated)

### Validation Query
```sql
-- Count events with same stripe_event_id
SELECT stripe_event_id, COUNT(*) as event_count
FROM billing_events
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- Verify event was logged once
SELECT * FROM billing_events
WHERE stripe_event_id = '<ACTUAL_EVENT_ID>'
ORDER BY created_at;
-- Expected: 1 row
```

---

## Test 4: Subscription State Updates

### Test Flow: Created → Updated → Deleted

#### Step 1: Create Subscription
```bash
stripe trigger customer.subscription.created \
  --add customer:metadata[user_id]=<USER_UUID>
```

**Validation:**
```sql
SELECT status, stripe_subscription_id, plan_id
FROM user_subscriptions
WHERE user_id = '<USER_UUID>'
ORDER BY created_at DESC LIMIT 1;
-- Expected: status = 'active'
```

#### Step 2: Update Subscription (e.g., plan change)
```bash
stripe trigger customer.subscription.updated \
  --add customer:metadata[user_id]=<USER_UUID>
```

**Validation:**
```sql
SELECT status, updated_at
FROM user_subscriptions
WHERE user_id = '<USER_UUID>'
ORDER BY updated_at DESC LIMIT 1;
-- Expected: updated_at changed, status may change
```

#### Step 3: Cancel Subscription
```bash
stripe trigger customer.subscription.deleted \
  --add customer:metadata[user_id]=<USER_UUID>
```

**Validation:**
```sql
SELECT status, cancel_at_period_end
FROM user_subscriptions
WHERE user_id = '<USER_UUID>'
ORDER BY updated_at DESC LIMIT 1;
-- Expected: status = 'canceled' or cancel_at_period_end = true
```

---

## Test 5: Raw Body Signature Verification

### Verify Handler Uses Raw Body
**Critical Check:** The webhook handler MUST use the raw, unmodified request body for signature verification.

**Review `supabase/functions/stripe-webhook/index.ts`:**
```typescript
// ✅ CORRECT: Read raw body as text
const rawBody = await req.text();

// Verify signature with raw body
const isValid = await verifyStripeSignature(
  rawBody,           // Raw body string
  signatureHeader,
  webhookSecret
);

// ❌ WRONG: Parsing body before verification
// const body = await req.json();  // Don't do this first!
```

**Test with Malformed JSON:**
```bash
# Send webhook with trailing comma (invalid JSON but valid signature)
curl -X POST "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "stripe-signature: $(generate_valid_signature)" \
  -d '{"id": "evt_test", "type": "test",}'
```

**Expected:** Should verify signature BEFORE parsing JSON. If signature valid but JSON invalid, return appropriate error.

---

## Edge Function Logs Review

### Check Webhook Logs
```bash
# View webhook function logs
supabase functions logs stripe-webhook --limit 50
```

### Expected Log Patterns

**Valid Webhook:**
```
[Webhook] Processing event: evt_xxx (customer.subscription.created)
[Webhook] Signature verified
[Webhook] Event not duplicate, processing...
[Webhook] Subscription upserted for user: <uuid>
[Webhook] Event recorded in billing_events
```

**Invalid Signature:**
```
[Webhook] Signature verification failed
[Security] Logged webhook_signature_failed event
```

**Duplicate Event:**
```
[Webhook] Processing event: evt_xxx
[Webhook] Event evt_xxx already processed, skipping (idempotent)
```

---

## Acceptance Criteria

### ✅ Webhook Security
- [ ] Valid signature → 200 OK, event processed
- [ ] Invalid signature → 400 Bad Request, no DB changes
- [ ] Signature verified on raw body (before JSON parsing)
- [ ] Security audit log captures failed signatures

### ✅ Idempotency
- [ ] Duplicate event.id → 200 OK, no duplicate insert
- [ ] `billing_events` unique constraint on `stripe_event_id`
- [ ] `user_subscriptions` upsert (not insert) on same subscription_id

### ✅ Subscription State
- [ ] Created event → new subscription row, status 'active'
- [ ] Updated event → existing row updated, timestamps changed
- [ ] Deleted event → status set to 'canceled' or cancel_at_period_end

### ✅ Observability
- [ ] All webhook events logged to `security_audit_log`
- [ ] Edge function logs show event flow
- [ ] Correlation ID links webhook → DB changes

---

## Test Execution Log

| Test | Status | Date | Tester | Notes |
|------|--------|------|--------|-------|
| Valid Signature | ⏳ | - | - | - |
| Invalid Signature | ⏳ | - | - | - |
| Duplicate Event | ⏳ | - | - | - |
| Subscription Updates | ⏳ | - | - | - |
| Raw Body Verification | ⏳ | - | - | - |

---

## Cleanup

```sql
-- Delete test events (after validation)
DELETE FROM billing_events WHERE stripe_event_id LIKE 'evt_test_%';
DELETE FROM user_subscriptions WHERE stripe_subscription_id LIKE 'sub_test%';
```
