# Payment Flow Integration Tests

## Test Environment Setup

```bash
# Use Stripe test mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Test card numbers (from Stripe docs)
SUCCESS_CARD=4242424242424242
DECLINE_CARD=4000000000000002
INSUFFICIENT_FUNDS=4000000000009995
```

## Test Flow 1: Successful Subscription Purchase

### Steps:
1. **User navigates to /pricing**
   - [ ] Pricing plans load from `subscription_plans` table
   - [ ] All plan features display correctly
   - [ ] Monthly/Yearly toggle works

2. **User clicks "Upgrade Now" on Premium plan**
   - [ ] Authentication check passes
   - [ ] `create-checkout` function called with correct parameters
   - [ ] Idempotency key generated: `checkout_${userId}_${timestamp}`

3. **Edge Function: create-checkout**
   - [ ] Validates user authentication (401 if not authenticated)
   - [ ] Checks rate limit (10 per 10 minutes)
   - [ ] Fetches plan from database (server-side)
   - [ ] Gets or creates Stripe customer
   - [ ] Creates Stripe Checkout Session with idempotency key
   - [ ] Logs to `security_audit_log` with event_type "checkout_created"
   - [ ] Returns session URL

4. **User redirected to Stripe Checkout**
   - [ ] Session URL is valid HTTPS
   - [ ] Stripe hosted page loads
   - [ ] Plan details match selection

5. **User enters test card 4242 4242 4242 4242**
   - [ ] Stripe validates card
   - [ ] Payment succeeds

6. **Stripe sends webhook: customer.subscription.created**
   - [ ] Webhook received at `/functions/v1/stripe-webhook`
   - [ ] Signature verified using `STRIPE_WEBHOOK_SECRET`
   - [ ] Event ID checked for duplicates
   - [ ] Subscription data parsed
   - [ ] User ID extracted from metadata
   - [ ] `user_subscriptions` table updated/inserted
   - [ ] `billing_events` table logs "subscription_created"
   - [ ] `security_audit_log` logs "subscription_updated"

7. **User redirected to success URL**
   - [ ] Returns to app at /dashboard?success=true
   - [ ] Subscription status reflects "active"
   - [ ] Premium features unlocked

### Expected Database State:
```sql
-- user_subscriptions
SELECT 
  user_id,
  status,
  stripe_subscription_id,
  current_period_end
FROM user_subscriptions
WHERE user_id = '${TEST_USER_ID}';
-- Expected: 1 row, status = 'active'

-- billing_events
SELECT event_type, status
FROM billing_events
WHERE user_id = '${TEST_USER_ID}'
ORDER BY created_at DESC LIMIT 5;
-- Expected: 'subscription_created', status = 'succeeded'

-- security_audit_log
SELECT event_type
FROM security_audit_log
WHERE user_id = '${TEST_USER_ID}'
AND event_type IN ('checkout_created', 'subscription_updated')
ORDER BY created_at DESC;
-- Expected: 2 rows
```

## Test Flow 2: Payment Declined

### Steps:
1. User selects plan and reaches Stripe Checkout
2. User enters declined card: `4000 0000 0000 0002`
3. Stripe declines payment
4. **Expected**: User remains on Stripe Checkout with error message
5. **Expected**: No webhook sent (payment never succeeded)
6. **Expected**: No database changes
7. User clicks "Back" or closes tab
8. **Expected**: User returned to cancel URL

### Validation:
```sql
-- No subscription created
SELECT COUNT(*) FROM user_subscriptions WHERE user_id = '${TEST_USER_ID}';
-- Expected: 0 (or unchanged from before)
```

## Test Flow 3: Webhook Signature Failure

### Attack Simulation:
```bash
# Attacker tries to send fake webhook
curl -X POST https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=fakesignature" \
  -d '{
    "type": "customer.subscription.created",
    "data": {
      "object": {
        "id": "sub_fake123",
        "customer": "cus_fake456",
        "status": "active",
        "metadata": {"user_id": "victim-user-id"}
      }
    }
  }'
```

### Expected Result:
- [ ] HTTP 400 Bad Request
- [ ] Response: `{"error": "Invalid signature"}`
- [ ] No database changes
- [ ] Security audit log entry: "webhook_signature_failed"

## Test Flow 4: Duplicate Webhook Handling

### Simulation:
1. Stripe sends `customer.subscription.created` (event ID: `evt_test123`)
2. Webhook processed successfully
3. **Stripe retries** same event (network issue simulation)
4. Duplicate event ID `evt_test123` detected

### Expected:
- [ ] Second webhook returns 200 OK (idempotent)
- [ ] No duplicate database entries
- [ ] Log: "Duplicate event ignored: evt_test123"

### Validation:
```sql
-- Only one subscription record
SELECT COUNT(*) FROM user_subscriptions 
WHERE stripe_subscription_id = 'sub_test123';
-- Expected: 1

-- Only one billing event
SELECT COUNT(*) FROM billing_events 
WHERE stripe_event_id = 'evt_test123';
-- Expected: 1
```

## Test Flow 5: Idempotent Checkout Creation

### Simulation:
1. User clicks "Upgrade Now" → idempotency key: `checkout_user123_20250105120000`
2. Request 1 creates Stripe session: `cs_test_abc`
3. **User double-clicks** (or network retry) → same idempotency key
4. Request 2 with same key

### Expected:
- [ ] Stripe returns same session ID: `cs_test_abc`
- [ ] No duplicate sessions created
- [ ] User redirected to same checkout URL

## Test Flow 6: Billing Portal Access

### Steps:
1. User with active subscription navigates to /dashboard
2. User clicks "Manage Billing"
3. `customer-portal` edge function called

### Validations:
- [ ] User authentication required (401 if not logged in)
- [ ] Active subscription required (404 if none)
- [ ] Stripe customer ID fetched from `user_subscriptions`
- [ ] Stripe Billing Portal Session created
- [ ] User redirected to Stripe portal
- [ ] User can update payment method, cancel subscription
- [ ] On return, app reflects changes

### After Cancellation:
```sql
-- Webhook: customer.subscription.updated (cancel_at_period_end = true)
SELECT status, cancel_at_period_end 
FROM user_subscriptions 
WHERE user_id = '${TEST_USER_ID}';
-- Expected: status = 'active', cancel_at_period_end = true
```

## Test Flow 7: Subscription Renewal

### Simulation:
1. Active subscription approaches renewal date
2. Stripe attempts to charge card
3. **Success case**: Card charged successfully
   - [ ] Webhook: `invoice.payment_succeeded`
   - [ ] `current_period_end` updated
   - [ ] `billing_events` logs "payment_succeeded"

4. **Failure case**: Card declined
   - [ ] Webhook: `invoice.payment_failed`
   - [ ] User notified via email (Stripe default)
   - [ ] Subscription status remains "active" during grace period
   - [ ] After multiple failures: `customer.subscription.deleted`
   - [ ] Subscription status → "canceled"
   - [ ] Premium features revoked

## Test Flow 8: Rate Limiting on Checkout

### Simulation:
```javascript
// Rapid-fire checkout attempts
for (let i = 0; i < 15; i++) {
  await fetch('/functions/v1/create-checkout', {
    method: 'POST',
    headers: { Authorization: 'Bearer ${token}' },
    body: JSON.stringify({ planId, successUrl, cancelUrl })
  });
}
```

### Expected:
- [ ] First 10 requests: 200 OK
- [ ] 11th request: 429 Too Many Requests
- [ ] Response: `{"error": "Too many checkout requests...", "code": "RATE_LIMITED"}`
- [ ] Security audit log: "rate_limit_exceeded"

## Acceptance Criteria

All flows must pass with:
- ✅ No unauthorized subscription creation
- ✅ No double-charging
- ✅ Webhook signatures always verified
- ✅ Idempotency enforced
- ✅ Rate limiting active
- ✅ Proper error handling and logging

**Test Status**: ⏳ Pending Execution  
**Last Run**: [Date]  
**Pass Rate**: [X/8 flows]
