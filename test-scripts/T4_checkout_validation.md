# T4 Checkout Flow - End-to-End Validation

## Prerequisites

1. **Stripe Account**: Test mode enabled
2. **Feature Flag**: `enablePayments: true` in `public/config/runtime.json`
3. **Webhook Secret**: Configured in Supabase secrets
4. **Test Cards**: Use Stripe test cards

## Step 1: Verify Edge Function Exists

```bash
# Check create-checkout function is deployed
curl https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/create-checkout \
  -H "apikey: YOUR_ANON_KEY" \
  -v

# Expected: 401 (auth required) or 400 (missing params)
# NOT: 404 (function missing)
```

## Step 2: Test Checkout Creation (Authenticated)

### Get Auth Token
```javascript
// In browser console on https://strideguide.lovable.app
const { data } = await supabase.auth.getSession();
console.log('Token:', data.session?.access_token);
```

### Create Checkout Session
```bash
# Replace YOUR_TOKEN with actual token from above
curl -X POST \
  https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmRpZnNic21wdm1wdWRnbGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjA1NDUsImV4cCI6MjA3NDYzNjU0NX0.OBtOjMTiZrgV08ttxiIeT48_ITJ_C88gz_kO-2eLUEk" \
  -H "Content-Type: application/json" \
  -H "Origin: https://strideguide.lovable.app" \
  -d '{
    "planId": "PLAN_ID_FROM_SUBSCRIPTION_PLANS_TABLE",
    "isYearly": false,
    "successUrl": "https://strideguide.lovable.app/dashboard?checkout=success",
    "cancelUrl": "https://strideguide.lovable.app/dashboard?checkout=cancelled",
    "idempotencyKey": "test-'$(date +%s)'"
  }'

# Expected response:
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

### Get Plan ID
```sql
-- Run in Supabase SQL Editor
SELECT id, name, price_monthly, price_yearly 
FROM subscription_plans 
WHERE is_active = true;
```

## Step 3: Complete Test Purchase

1. **Open checkout URL** from response
2. **Use Stripe test card**: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
3. **Submit payment**
4. **Verify redirect** to success URL

## Step 4: Verify Webhook Received

### Check Edge Function Logs
Navigate to: https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/functions/stripe-webhook/logs

**Expected logs:**
```
[UUID] Webhook received
[UUID] Signature verified for event evt_1...
[UUID] Processing subscription event for sub_1...
[UUID] Subscription upserted successfully
```

### Check Database
```sql
-- Verify user_subscriptions row created
SELECT 
  us.user_id,
  sp.name as plan_name,
  us.status,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_end
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'YOUR_USER_ID'
ORDER BY us.created_at DESC;

-- Verify billing_events logged
SELECT 
  event_type,
  stripe_event_id,
  status,
  created_at
FROM billing_events
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

## Step 5: Verify UI Reflects Subscription

1. **Navigate to** `/dashboard`
2. **Check** subscription badge shows active plan
3. **Verify** usage meter displays
4. **Confirm** "Billing Portal" button appears

## Common Issues & Fixes

### Issue: `{ error: "Service misconfigured" }`
**Cause**: Missing Stripe secret key  
**Fix**: Run `SELECT * FROM vault.decrypted_secrets WHERE name = 'STRIPE_SECRET_KEY'` in Supabase SQL

### Issue: `{ error: "Plan not found" }`
**Cause**: Invalid planId  
**Fix**: Get valid plan ID from `subscription_plans` table (Step 3)

### Issue: Webhook not processing
**Cause**: `enableWebhooks: false` or webhook secret mismatch  
**Fix**: 
1. Set `enableWebhooks: true` in `runtime.json`
2. Verify `STRIPE_WEBHOOK_SIGNING_SECRET` matches Stripe dashboard

### Issue: Redirect fails after payment
**Cause**: Incorrect success/cancel URLs  
**Fix**: Ensure URLs match Site URL in Supabase Auth config

## Stripe Dashboard Verification

### Test Mode Enabled
Navigate to: https://dashboard.stripe.com/test/dashboard

### Check Customer Created
1. Go to **Customers**
2. Search by email
3. Verify customer exists with metadata `supabase_user_id`

### Check Subscription Active
1. Go to **Subscriptions**
2. Find subscription
3. Verify status = "active"

### Check Webhook Events
1. Go to **Developers > Webhooks**
2. Find webhook endpoint: `https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/stripe-webhook`
3. Click "Send test webhook"
4. Select `customer.subscription.created`
5. Verify response: `200 OK`

## Acceptance Criteria

✅ **T4.1**: Edge function returns valid Stripe Checkout URL  
✅ **T4.2**: Checkout page loads with correct plan/price  
✅ **T4.3**: Test payment succeeds with test card  
✅ **T4.4**: Redirects to success URL after payment  
✅ **T4.5**: Webhook processes and logs to `billing_events`  
✅ **T4.6**: `user_subscriptions` row created with status=active  
✅ **T4.7**: Dashboard UI reflects active subscription  
✅ **T4.8**: Stripe dashboard shows customer + subscription

## Test Script (Browser Console)

```javascript
// Run this in browser console on https://strideguide.lovable.app

async function testCheckoutFlow() {
  console.log('🧪 Testing Checkout Flow...');
  
  // 1. Get auth session
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error('❌ Not authenticated');
    return;
  }
  console.log('✅ Authenticated as:', sessionData.session.user.email);
  
  // 2. Get plan ID
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, price_monthly')
    .eq('is_active', true)
    .limit(1);
    
  if (!plans?.length) {
    console.error('❌ No plans found');
    return;
  }
  console.log('✅ Using plan:', plans[0].name);
  
  // 3. Create checkout session
  const { data: checkout, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      planId: plans[0].id,
      isYearly: false,
      successUrl: `${window.location.origin}/dashboard?checkout=success`,
      cancelUrl: `${window.location.origin}/dashboard?checkout=cancelled`,
      idempotencyKey: `test-${Date.now()}`
    }
  });
  
  if (error) {
    console.error('❌ Checkout creation failed:', error);
    return;
  }
  
  console.log('✅ Checkout session created:', checkout.sessionId);
  console.log('🔗 URL:', checkout.url);
  console.log('📌 Open this URL to complete test purchase');
}

testCheckoutFlow();
```

## Next Steps After Success

1. Test cancellation flow (Billing Portal)
2. Test subscription upgrade/downgrade
3. Test failed payment handling
4. Test trial period expiration
5. Load test with multiple concurrent checkouts
