# Supabase Manual Configuration Guide
## T-AUTH-02 & T-AUTH-04: Fix Preflight & Lock Origins

### ⚠️ CRITICAL: These steps MUST be completed in Supabase Dashboard

The auth service is hosted by Supabase, not our edge functions. CORS/preflight configuration must be done in the Supabase dashboard.

---

## Step 1: Navigate to Auth URL Configuration

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc
2. Go to **Authentication** → **URL Configuration**

---

## Step 2: Configure Site URL

**Setting**: `Site URL`

**Value**: 
```
https://strideguide.lovable.app
```

**Purpose**: This is the primary origin that Supabase will allow for auth requests.

---

## Step 3: Configure Redirect URLs

**Setting**: `Redirect URLs`

**Add these URLs** (one per line):

```
https://strideguide.lovable.app/**
https://*.lovable.app/**
http://localhost:8080/**
http://localhost:5173/**
```

**Purpose**: Allows authentication callbacks from all environments (preview, prod, local dev).

---

## Step 4: Configure CORS Origins (if available)

**Setting**: `Additional Allowed Origins` or `CORS Origins`

**Add these origins**:

```
https://strideguide.lovable.app
https://*.lovable.app
http://localhost:8080
http://localhost:5173
```

**Purpose**: Allows preflight OPTIONS requests from these origins.

---

## Step 5: Email Confirmation Settings (Optional for Testing)

**Setting**: `Enable email confirmations`

**For Testing**: Turn **OFF** to speed up testing
**For Production**: Turn **ON** for security

**Location**: Authentication → Settings → Email Auth

---

## Step 6: Save All Changes

1. Click **Save** at the bottom of the page
2. Wait 30-60 seconds for changes to propagate

---

## Step 7: Test Configuration

### Option A: Run Diagnostic Script

1. Open browser DevTools console on https://strideguide.lovable.app
2. Run: `runAuthDiagnostics()`
3. Review results - all tests should pass

### Option B: Manual Test

1. Open DevTools → Network → Preserve log
2. Try to sign in with test credentials
3. Look for:
   - **OPTIONS** request to `/auth/v1/token` → Status: 204/200
   - **POST** request to `/auth/v1/token` → Status: 200 (success) or 400 (bad creds)
4. No "Network error" or CORS errors in console

---

## Expected Headers After Configuration

### Preflight (OPTIONS) Response:
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://strideguide.lovable.app
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
Vary: Origin
```

### Auth POST Response:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://strideguide.lovable.app
Access-Control-Allow-Credentials: true
Set-Cookie: sb-yrndifsbsmpvmpudglcc-auth-token=...; HttpOnly; Secure; SameSite=None; Path=/
```

---

## Troubleshooting

### "Failed to fetch" or CORS error persists

**Cause**: Configuration not propagated yet
**Fix**: Wait 1-2 minutes and try again. Clear browser cache if needed.

### "Invalid redirect URL" error

**Cause**: Current origin not in Redirect URLs list
**Fix**: Add the exact origin (including protocol) to Redirect URLs

### Sign-in works but redirects to localhost

**Cause**: Site URL is set to localhost
**Fix**: Set Site URL to your production/preview URL

---

## Validation Checklist

- [ ] Site URL set to `https://strideguide.lovable.app`
- [ ] Redirect URLs include all preview/prod/local origins
- [ ] CORS origins configured (if setting available)
- [ ] Email confirmation disabled for testing (optional)
- [ ] Changes saved in dashboard
- [ ] Waited 60 seconds for propagation
- [ ] Ran `runAuthDiagnostics()` - all tests pass
- [ ] Manual sign-in test successful
- [ ] No CORS errors in console
- [ ] OPTIONS returns 204/200 with correct headers
- [ ] POST returns 200 with auth token

---

## Status Tracking

**T-AUTH-02 (Fix Preflight)**: 
- [ ] Configured in Supabase Dashboard
- [ ] OPTIONS returns 204/200
- [ ] Correct CORS headers present

**T-AUTH-04 (Lock Origins)**:
- [ ] Site URL locked to production origin
- [ ] All redirect URLs added
- [ ] No localhost in production config

**T-AUTH-03 (Cookies)**:
- [x] Handled automatically by Supabase
- [x] Client configured with `credentials: 'include'`

**T-AUTH-05 (Error Messages)**:
- [x] Specific error messages implemented
- [x] Correlation IDs in logs

---

## Quick Reference Links

- **Supabase Auth Config**: https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/url-configuration
- **Supabase Auth Settings**: https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/settings/auth
- **Diagnostic Script**: Load `/artifacts/auth/2025-01-06/auth-diagnostic.ts` and run `runAuthDiagnostics()`

---

## Definition of Done

✅ Sign-in works end-to-end on preview URL
✅ OPTIONS preflight returns 204/200 with correct headers
✅ Cookie persists (session maintained)
✅ User sees precise errors on 401
✅ Evidence archived (HAR + screenshots)
