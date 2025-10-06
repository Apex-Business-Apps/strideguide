# Auth Diagnostic Protocol T-AUTH-01 to T-AUTH-06

## T-AUTH-01: Identify Failing Call
**Status**: Awaiting HAR export from DevTools

**Instructions**:
1. Open DevTools → Network → Preserve log
2. Press Sign In once
3. Look for OPTIONS preflight + POST to `https://yrndifsbsmpvmpudglcc.supabase.co/auth/v1/token?grant_type=password`
4. Right-click → Save all as HAR with content
5. Upload to this directory as `preflight.har`

## Expected Endpoints
- **OPTIONS preflight**: `https://yrndifsbsmpvmpudglcc.supabase.co/auth/v1/token?grant_type=password`
- **POST signin**: `https://yrndifsbsmpvmpudglcc.supabase.co/auth/v1/token?grant_type=password`

## Required CORS Headers
```
Access-Control-Allow-Origin: https://strideguide.lovable.app
Access-Control-Allow-Methods: POST, OPTIONS, GET
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Credentials: true
Vary: Origin
```

## Current App Origin
`https://strideguide.lovable.app`

## Status Log
- [ ] T-AUTH-01: HAR captured
- [ ] T-AUTH-02: Preflight fixed (server-side Supabase config)
- [ ] T-AUTH-03: Cookie alignment verified
- [ ] T-AUTH-04: Origins locked in Supabase Dashboard
- [ ] T-AUTH-05: Error messages improved (done in code)
- [ ] T-AUTH-06: Smoke tests completed

## Critical Notes
⚠️ **Password exposed in screenshot** - rotate immediately after testing
⚠️ The auth calls go directly to Supabase, not through our edge functions
⚠️ CORS must be configured in Supabase Dashboard → Authentication → URL Configuration
