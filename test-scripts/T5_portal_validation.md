# T5 Billing Portal - End-to-End Validation

## Prerequisites

1. **Active Subscription**: User must have completed T4 (checkout flow)
2. **Feature Flag**: `enablePayments: true` in `public/config/runtime.json`
3. **Stripe Account**: Customer portal enabled in Stripe dashboard

## Step 1: Verify Active Subscription Exists

```sql
-- Run in Supabase SQL Editor
SELECT 
  us.user_id,
  sp.name as plan_name,
  us.status,
  us.stripe_customer_id,
  us.stripe_subscription_id
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
LIMIT 1;
```

**Expected**: At least one row with `stripe_customer_id` populated

## Step 2: Test Portal Session Creation

### Get Auth Token
```javascript
// In browser console on https://strideguide.lovable.app
const { data } = await supabase.auth.getSession();
console.log('Token:', data.session?.access_token);
console.log('User ID:', data.session?.user.id);
```

### Create Portal Session
```bash
# Replace YOUR_TOKEN with actual token
curl -X POST \
  https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/customer-portal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmRpZnNic21wdm1wdWRnbGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjA1NDUsImV4cCI6MjA3NDYzNjU0NX0.OBtOjMTiZrgV08ttxiIeT48_ITJ_C88gz_kO-2eLUEk" \
  -H "Content-Type: application/json" \
  -H "Origin: https://strideguide.lovable.app" \
  -d '{
    "returnUrl": "https://strideguide.lovable.app/dashboard"
  }'

# Expected response:
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

## Step 3: Test Portal Access via UI

1. **Sign in** to app as user with active subscription
2. **Navigate to** `/dashboard`
3. **Click** "Billing Portal" button
4. **Verify redirect** to Stripe portal (billing.stripe.com)

## Step 4: Verify Portal Functionality

In the Stripe Billing Portal, test:

### 4.1 View Subscription Details
- [ ] Current plan displayed
- [ ] Next billing date shown
- [ ] Payment method visible

### 4.2 Update Payment Method
- [ ] Click "Update payment method"
- [ ] Add new test card: `4000 0025 0000 3155` (requires 3DS auth)
- [ ] Verify card saved

### 4.3 View Invoice History
- [ ] Click "Invoices"
- [ ] Verify past invoices listed
- [ ] Download invoice PDF

### 4.4 Cancel Subscription
- [ ] Click "Cancel subscription"
- [ ] Confirm cancellation
- [ ] Verify status changes to "cancels at period end"

### 4.5 Return to App
- [ ] Click "Return to [App Name]" link
- [ ] Verify redirect to `returnUrl` (dashboard)
- [ ] Confirm user session still active

## Step 5: Verify Webhook Processing

### Check Edge Function Logs
Navigate to: https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/functions/stripe-webhook/logs

**Expected logs after cancellation:**
```
[UUID] Webhook received
[UUID] Signature verified for event evt_1...
[UUID] Processing subscription event for sub_1...
[UUID] Subscription status updated: canceling
```

### Check Database Updates
```sql
-- Verify subscription status updated
SELECT 
  status,
  cancel_at_period_end,
  updated_at
FROM user_subscriptions
WHERE user_id = 'YOUR_USER_ID';

-- Verify billing event logged
SELECT 
  event_type,
  stripe_event_id,
  created_at
FROM billing_events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type LIKE '%cancel%'
ORDER BY created_at DESC
LIMIT 1;
```

## Step 6: Verify UI Reflects Changes

1. **Return to** `/dashboard`
2. **Refresh page**
3. **Verify** subscription badge shows "cancels at period end" or updated status
4. **Check** usage meter still displays correctly
5. **Confirm** portal button still accessible

## Common Issues & Fixes

### Issue: `{ error: "No active subscription found" }`
**Cause**: User has no subscription or subscription is not active  
**Fix**: Complete T4 (checkout) first to create subscription

### Issue: `{ error: "Not authenticated" }`
**Cause**: Missing or expired auth token  
**Fix**: Sign in again to get fresh token

### Issue: Portal button not visible
**Cause**: `enablePayments: false` or subscription status = 'free'  
**Fix**: 
1. Set `enablePayments: true` in `runtime.json`
2. Ensure user has active subscription

### Issue: Return URL fails
**Cause**: Incorrect `returnUrl` or CORS blocking redirect  
**Fix**: Verify `returnUrl` matches Site URL in Supabase Auth config

### Issue: Portal shows 404
**Cause**: Stripe Customer Portal not enabled  
**Fix**: Enable in Stripe Dashboard > Settings > Customer Portal

## Stripe Dashboard Configuration

### Enable Customer Portal
1. Navigate to: https://dashboard.stripe.com/test/settings/billing/portal
2. Click **"Activate"** if not enabled
3. Configure settings:
   - [ ] Allow customers to update payment methods
   - [ ] Allow customers to update billing information
   - [ ] Allow customers to view invoices
   - [ ] Allow customers to cancel subscriptions
4. Set **Business information** (name, email, support URL)
5. Customize **Branding** (logo, colors)

### Verify Webhook Endpoint
1. Go to **Developers > Webhooks**
2. Find endpoint: `https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/stripe-webhook`
3. Verify events enabled:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Security Validation

### Audit Log Check
```sql
-- Verify portal access logged
SELECT 
  user_id,
  event_type,
  event_data,
  created_at
FROM security_audit_log
WHERE event_type = 'billing_portal_accessed'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: Entry for each portal access with session ID

## Acceptance Criteria

✅ **T5.1**: Edge function returns valid Stripe portal URL  
✅ **T5.2**: Portal page loads and displays subscription  
✅ **T5.3**: User can update payment method  
✅ **T5.4**: User can view invoice history  
✅ **T5.5**: User can cancel subscription (with confirmation)  
✅ **T5.6**: Cancellation webhook processed correctly  
✅ **T5.7**: Database updated with new subscription status  
✅ **T5.8**: Return URL redirects back to app correctly  
✅ **T5.9**: User session persists after portal visit  
✅ **T5.10**: Portal access logged in security audit log

## Test Script (Browser Console)

```javascript
// Run this in browser console on https://strideguide.lovable.app

async function testPortalFlow() {
  console.log('🧪 Testing Billing Portal Flow...');
  
  // 1. Get auth session
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error('❌ Not authenticated');
    return;
  }
  console.log('✅ Authenticated as:', sessionData.session.user.email);
  
  // 2. Check for active subscription
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_plans(name)')
    .eq('user_id', sessionData.session.user.id)
    .eq('status', 'active')
    .maybeSingle();
    
  if (!subscription) {
    console.error('❌ No active subscription found');
    console.log('💡 Complete T4 (checkout) first');
    return;
  }
  console.log('✅ Active subscription:', subscription.subscription_plans.name);
  
  // 3. Create portal session
  const { data: portal, error } = await supabase.functions.invoke('customer-portal', {
    body: {
      returnUrl: `${window.location.origin}/dashboard`
    }
  });
  
  if (error) {
    console.error('❌ Portal creation failed:', error);
    return;
  }
  
  console.log('✅ Portal session created');
  console.log('🔗 URL:', portal.url);
  console.log('📌 Open this URL to access billing portal');
  console.log('');
  console.log('Next steps:');
  console.log('1. Update payment method');
  console.log('2. View invoices');
  console.log('3. Cancel subscription (optional)');
  console.log('4. Click "Return to app" link');
  
  // Optional: Auto-open portal
  // window.open(portal.url, '_blank');
}

testPortalFlow();
```

## Next Steps After Success

1. Test subscription reactivation
2. Test upgrade/downgrade flows
3. Test proration calculations
4. Test failed payment recovery flow
5. Measure portal session latency (p95)
