# Supabase Manual Configuration — Required Steps

**CRITICAL:** These settings MUST be configured in the Supabase Dashboard before production launch.

---

## 1. Authentication URLs

**Navigate to:** [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/url-configuration)

### Site URL
Set the **Site URL** to your production domain:

```
https://strideguide.cam
```

This is the URL Supabase will redirect users to after email confirmation and OAuth flows.

---

### Redirect URLs

Add the following **Redirect URLs** (click "+ Add URL" for each):

```
https://strideguide.cam/
https://strideguide.cam/app
https://www.strideguide.cam/
https://www.strideguide.cam/app
```

**Why?** These are the allowed return paths after authentication. If a URL is missing, users will see "requested path is invalid" errors.

---

### Development URLs (Optional - Remove After Launch)

For local development and preview deployments, you may temporarily add:

```
http://localhost:5173/
http://localhost:5173/app
https://strideguide.lovable.app/
https://strideguide.lovable.app/app
```

**⚠️ IMPORTANT:** Remove these after production stabilizes to minimize attack surface.

---

## 2. Email Confirmation Settings (Optional)

**Navigate to:** [Supabase Dashboard → Authentication → Email](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/email)

### Disable Email Confirmation (Development Only)

For faster testing during development, you can disable "Confirm email" under **Email Auth**:

- **Enable Email Confirmation:** ❌ OFF

**⚠️ WARNING:** Re-enable this for production to prevent fake accounts.

---

## 3. Email Templates (Production Hardening)

**Navigate to:** [Supabase Dashboard → Authentication → Email Templates](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/templates)

### Customize Templates

Update the following templates to match your brand:

- **Confirm Signup:** Change `{{ .ConfirmationURL }}` redirect to `/app`
- **Magic Link:** Ensure redirect points to `/app` after sign-in
- **Reset Password:** Redirect to `/app` with token

**Example Confirmation Email:**
```html
<h2>Welcome to StrideGuide!</h2>
<p>Click the link below to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
```

---

## 4. Stripe Webhook Endpoint (If Using Payments)

**Navigate to:** [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

### Add Webhook Endpoint

- **URL:** `https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/stripe-webhook`
- **Events to Send:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### Copy Webhook Signing Secret

1. After creating the endpoint, Stripe will show a **Signing Secret** (starts with `whsec_...`)
2. This should already be set in Supabase Secrets as `STRIPE_WEBHOOK_SIGNING_SECRET`
3. If not set, add it via: [Supabase Dashboard → Settings → Edge Functions](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/settings/functions)

---

## 5. Test Webhook Delivery

**Navigate to:** [Stripe Dashboard → Webhooks → Your Endpoint → Send Test Webhook](https://dashboard.stripe.com/test/webhooks)

### Steps:
1. Select event: `checkout.session.completed`
2. Click "Send test webhook"
3. Verify:
   - Response status: `200 OK`
   - Supabase logs show event processed
   - Database row created in `user_subscriptions` table

**Check Database:**
```sql
SELECT * FROM user_subscriptions ORDER BY created_at DESC LIMIT 5;
```

---

## 6. RLS Policy Review (Optional but Recommended)

**Navigate to:** [Supabase Dashboard → Table Editor → Policies](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/editor)

### Verify Policies Exist For:
- `profiles` (users can read own profile)
- `user_subscriptions` (users can read own subscription)
- `user_roles` (admins can modify roles)
- `security_audit_log` (only service role can write)

**Test RLS:**
```sql
-- Run as authenticated user (use SQL Editor with JWT)
SELECT * FROM user_subscriptions WHERE user_id = auth.uid();
```

Should return only YOUR subscription, not all users.

---

## 7. Admin Setup (First Time Only)

**Navigate to:** Supabase SQL Editor

### Create First Admin User

If no admin exists, the first user can self-assign:

```sql
SELECT assign_admin_role(auth.uid(), 'admin');
```

**⚠️ SECURITY:** This ONLY works if no admins exist. After the first admin, only admins can grant roles.

---

## Verification Checklist

Before launching to production, verify:

- [ ] Site URL set to `https://strideguide.cam`
- [ ] All redirect URLs added (production + www)
- [ ] Email confirmation enabled (or disabled for testing)
- [ ] Email templates customized with correct redirect URLs
- [ ] Stripe webhook endpoint configured
- [ ] Webhook signing secret set in Supabase
- [ ] Test webhook sent successfully
- [ ] RLS policies reviewed and tested
- [ ] First admin user assigned

---

## Troubleshooting

### Error: "requested path is invalid"
- **Cause:** Redirect URL not in allowlist
- **Fix:** Add the exact URL to Supabase Dashboard → Redirect URLs

### Error: "Failed to fetch"
- **Cause:** CORS issue or Site URL mismatch
- **Fix:** Verify Site URL matches your domain exactly

### Webhook Delivery Failing
- **Cause:** Signing secret mismatch or endpoint unreachable
- **Fix:** Check Supabase function logs for validation errors

### Users Not Receiving Emails
- **Cause:** Email provider not configured or rate-limited
- **Fix:** Check Supabase Dashboard → Logs for SMTP errors

---

**Need Help?** Check the [Supabase Auth Documentation](https://supabase.com/docs/guides/auth) or contact support.
