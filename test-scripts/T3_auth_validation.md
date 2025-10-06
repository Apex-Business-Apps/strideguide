# T3 Auth Path Hardening - Validation Script

## Preflight (OPTIONS) Verification

### Test Supabase Auth Endpoint
```bash
# Test OPTIONS preflight to Supabase auth endpoint
curl -X OPTIONS \
  -H "Origin: https://strideguide.lovable.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,apikey,content-type" \
  https://yrndifsbsmpvmpudglcc.supabase.co/auth/v1/token?grant_type=password \
  -v

# Expected response:
# HTTP/2 204 or 200
# access-control-allow-origin: https://strideguide.lovable.app
# access-control-allow-methods: GET, POST, OPTIONS
# access-control-allow-headers: authorization, apikey, content-type
# access-control-max-age: 86400
```

### Test Edge Function Preflight
```bash
# Test create-checkout OPTIONS
curl -X OPTIONS \
  -H "Origin: https://strideguide.lovable.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/create-checkout \
  -v

# Expected response:
# HTTP/2 204
# access-control-allow-origin: https://strideguide.lovable.app
# access-control-allow-methods: GET, POST, OPTIONS
# access-control-allow-headers: authorization, x-client-info, apikey, content-type
```

## CORS Headers Validation

**Current implementation** in `supabase/functions/_shared/cors.ts`:
```typescript
ALLOWED_ORIGINS = [
  'https://yrndifsbsmpvmpudglcc.supabase.co',
  'https://strideguide.lovable.app',
  'http://localhost:8080',
];
```

✅ **Status**: Centralized CORS with allow-list (no wildcards)

## Cookie/Session Alignment

### Supabase Client Configuration
**File**: `src/integrations/supabase/client.ts`
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,        // ✅ Persistent storage
    persistSession: true,          // ✅ Sessions persist across reloads
    autoRefreshToken: true,        // ✅ Auto-refresh enabled
  }
});
```

### SameSite Configuration
Supabase handles cookies internally. For custom cookies (if added):
- Must set `SameSite=Lax` or `Strict` (never `None` without `Secure`)
- Must set `Secure=true` in production (HTTPS only)

## Network Error Diagnosis

### Common Causes
1. **Preflight blocked**: OPTIONS returns 403/401
   - **Fix**: Verify origin in `ALLOWED_ORIGINS` list
   
2. **Missing CORS headers**: Response lacks `Access-Control-Allow-Origin`
   - **Fix**: Verify `getCorsHeaders()` called in edge functions
   
3. **Auth token not sent**: Client doesn't include `Authorization` header
   - **Fix**: Verify Supabase client auto-attaches token

4. **Email confirmation required**: Supabase blocks login until email verified
   - **Fix**: Disable "Confirm email" in Supabase dashboard for testing

### Browser DevTools Check
```javascript
// Open DevTools Console, paste this to check auth state
await supabase.auth.getSession().then(({ data, error }) => {
  console.log('Session:', data.session);
  console.log('User:', data.session?.user);
  console.log('Token:', data.session?.access_token);
});

// Check if token is being sent
fetch('https://yrndifsbsmpvmpudglcc.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'YOUR_ANON_KEY',
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
  }
}).then(r => console.log('Auth header sent:', r.ok));
```

## Required Supabase Configuration

### URL Configuration (CRITICAL)
Navigate to: **Authentication > URL Configuration**

**Site URL**: `https://strideguide.lovable.app`  
**Redirect URLs**:
- `https://strideguide.lovable.app/**`
- `http://localhost:8080/**` (for local dev)

### Email Settings
For testing, disable:
- [ ] Confirm email (allows instant signin without verification)
- [ ] Secure email change (allows email updates without re-confirmation)

For production, re-enable both.

## Validation Checklist

- [ ] OPTIONS preflight returns 204 with correct headers
- [ ] Origin matches one in `ALLOWED_ORIGINS` array
- [ ] Supabase client uses `localStorage` + `persistSession: true`
- [ ] Site URL and Redirect URLs configured in Supabase
- [ ] Email confirmation disabled for testing
- [ ] Browser DevTools shows session token present
- [ ] Network tab shows `Authorization: Bearer <token>` header
- [ ] No "Network error" or "CORS" errors in console

## Next Steps

1. **Run OPTIONS tests** (curl commands above)
2. **Check Supabase dashboard** URL configuration
3. **Test signin** with browser DevTools open
4. **Capture network logs** if error persists
5. **Share exact error message** for further diagnosis

## Acceptance Criteria

✅ Sign-in, sign-up, reset work end-to-end  
✅ No "Network error" in console  
✅ Session persists across page reloads  
✅ Preflight (OPTIONS) returns proper headers  
✅ Auth token automatically attached to requests
