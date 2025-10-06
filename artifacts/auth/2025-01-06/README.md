# Auth Diagnostic Protocol T-AUTH-01 to T-AUTH-06

## 🎯 Quick Start

### Automated Diagnostic (Fastest)
1. Open https://strideguide.lovable.app
2. Open DevTools Console
3. Run: `runAuthDiagnostics()`
4. Review output - follow suggested next steps

### Manual Diagnostic (Most Thorough)
1. Run T-AUTH-01 to capture HAR file
2. Complete Supabase manual configuration (see `SUPABASE_MANUAL_CONFIG.md`)
3. Run T-AUTH-06 smoke tests

---

## T-AUTH-01: Identify Failing Call ✅
**Status**: Diagnostic script created

**Automated Option**:
1. Load diagnostic script in browser console
2. Run: `runAuthDiagnostics()`
3. Export results: `copy(JSON.stringify(authDiagResult, null, 2))`

**Manual Option**:
1. Open DevTools → Network → Preserve log
2. Press Sign In once
3. Look for OPTIONS preflight + POST to `https://yrndifsbsmpvmpudglcc.supabase.co/auth/v1/token?grant_type=password`
4. Right-click → Save all as HAR with content
5. Upload to this directory as `preflight.har`

---

## T-AUTH-02: Fix Preflight (Server) ⚠️ MANUAL CONFIG REQUIRED
**Status**: Awaiting Supabase Dashboard configuration

**Action Required**: Complete manual configuration in Supabase Dashboard

📖 **Full Instructions**: See `SUPABASE_MANUAL_CONFIG.md`

**Quick Steps**:
1. Go to: https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/url-configuration
2. Set **Site URL**: `https://strideguide.lovable.app`
3. Add **Redirect URLs**:
   - `https://strideguide.lovable.app/**`
   - `https://*.lovable.app/**`
   - `http://localhost:8080/**`
4. Save and wait 60 seconds
5. Test with `runAuthDiagnostics()`

**Expected Result**: OPTIONS returns 204/200 with correct CORS headers

---

## T-AUTH-03: Align Cookies ✅
**Status**: Auto-handled by Supabase

**Client Config**: Already configured in `src/integrations/supabase/client.ts`
- `storage: localStorage` ✅
- `persistSession: true` ✅
- `autoRefreshToken: true` ✅
- `flowType: 'pkce'` ✅

**Server Config**: Supabase sets cookies with:
- `HttpOnly; Secure; SameSite=None; Path=/` (automatic)

**Validation**: Run `runAuthDiagnostics()` → Check cookie test

---

## T-AUTH-04: Lock Origins/Redirects ⚠️ MANUAL CONFIG REQUIRED
**Status**: Awaiting Supabase Dashboard configuration

**Action Required**: Same as T-AUTH-02 (combined configuration)

📖 **Full Instructions**: See `SUPABASE_MANUAL_CONFIG.md`

**Validation Checklist**:
- [ ] Site URL = `https://strideguide.lovable.app` (single origin)
- [ ] Redirect URLs include all valid origins
- [ ] No localhost in production config
- [ ] No staging URLs in production allowlist

---

## T-AUTH-05: Replace Generic Error ✅
**Status**: COMPLETED

**Implementation**: Enhanced error handling in `src/components/auth/AuthPage.tsx`

**Error Messages**:
- CORS/Network: "Unable to connect. Please check your connection and try again."
- 401/403: "Invalid email or password. Please try again."
- 422: "Please enter a valid email address."
- Email not confirmed: "Please check your email and confirm your account."
- Timeout: "Request timed out. Please try again."

**Logging**: All errors include correlation IDs for debugging

---

## T-AUTH-06: Smoke & Evidence ⏳
**Status**: Ready to execute after T-AUTH-02/04

**Test Matrix**:
| Device | Browser | Test | Expected |
|--------|---------|------|----------|
| Android | Chrome | Sign-in success | ✅ User logged in |
| Android | Chrome | Wrong password | ❌ "Invalid email or password" |
| Android | Chrome | Sign-out + sign-in | ✅ Works |
| iOS | Safari | Sign-in success | ✅ User logged in |
| iOS | Safari | Wrong password | ❌ "Invalid email or password" |
| iOS | Safari | Sign-out + sign-in | ✅ Works |

**Evidence to Capture**:
- [ ] HAR file for each flow
- [ ] Screenshots of success/error states
- [ ] 10-second video of full flow
- [ ] Save to `/artifacts/auth/2025-01-06/evidence/`

---

## 📊 Overall Status

### Completed ✅
- [x] T-AUTH-01: Diagnostic tooling created
- [x] T-AUTH-03: Cookie/session config verified
- [x] T-AUTH-05: Specific error messages implemented

### Blocked - Awaiting Manual Config ⚠️
- [ ] T-AUTH-02: Preflight CORS (Supabase Dashboard)
- [ ] T-AUTH-04: Origin allowlist (Supabase Dashboard)

### Ready After Unblock ⏳
- [ ] T-AUTH-06: Smoke tests + evidence

---

## 🚀 Next Steps for User

1. **Complete Supabase Configuration** (5 minutes)
   - Follow `SUPABASE_MANUAL_CONFIG.md`
   - Configure URL settings in dashboard
   - Wait 60 seconds for propagation

2. **Run Diagnostics** (1 minute)
   - Open https://strideguide.lovable.app
   - DevTools Console → `runAuthDiagnostics()`
   - Verify all tests pass

3. **Test Sign-in** (1 minute)
   - Attempt to sign in
   - Verify no "Network error"
   - Confirm user reaches authenticated state

4. **Capture Evidence** (optional)
   - HAR export
   - Screenshots
   - Share results

---

## 🔗 Quick Links

- **Diagnostic Script**: `auth-diagnostic.ts` (auto-loads in browser)
- **Manual Config Guide**: `SUPABASE_MANUAL_CONFIG.md`
- **Supabase Auth Config**: https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/url-configuration
- **Client Config**: `src/integrations/supabase/client.ts`
- **Auth Component**: `src/components/auth/AuthPage.tsx`

---

## ⚠️ Critical Notes

- ⚠️ **Password in screenshot**: Rotate test password immediately
- ⚠️ **Auth is Supabase-hosted**: CORS config must be in Supabase Dashboard, not our code
- ⚠️ **No edge function involvement**: Auth flows bypass our edge functions entirely
- ⚠️ **Configuration propagation**: Wait 60-120 seconds after saving Supabase settings

---

## 📝 Definition of Done

✅ Sign-in works end-to-end on Android and iOS  
✅ OPTIONS preflight returns 204/200 with correct headers  
✅ Cookie persists (if used)  
✅ User sees precise errors on 401  
✅ Evidence archived
