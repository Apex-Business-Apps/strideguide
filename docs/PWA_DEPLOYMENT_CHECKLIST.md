# PWA ⇄ Website Deployment Checklist for strideguide.cam

## ✅ Code Changes Complete

### 1. PWA Manifest Scoping
- ✅ Updated `public/manifest.json` and `public/manifest.webmanifest`
- ✅ Set `start_url: "/app?source=pwa"`
- ✅ Set `scope: "/app"`
- ✅ Updated shortcuts to use `/app` paths

### 2. Service Worker Isolation
- ✅ Modified `src/main.tsx` to register SW only on `/app` routes
- ✅ SW scope set to `/app` (not root `/`)
- ✅ Aggressive cache cleanup on marketing pages (non-`/app` routes)
- ✅ Bumped SW version to `sg-2025-10-08-app-scope-v1`

### 3. Marketing Site CTAs
- ✅ Added "Open App" button to header (desktop+)
- ✅ Added "Open App" button to footer
- ✅ All CTAs route to `/app` with source tracking (`?source=landing_cta`, `?source=header_cta`)

### 4. UTM Attribution
- ✅ Created `src/utils/utm-tracker.ts`
- ✅ Auto-captures UTM params on page load (24h TTL)
- ✅ Tracks app entry with UTM attribution in `/app`
- ✅ Integrates with Google Analytics (gtag) if present

---

## 🔧 Manual Configuration Required

### A. Supabase Auth Configuration

**Action Required:** Update Supabase Auth settings

1. Go to: https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/url-configuration

2. **Site URL:**
   ```
   https://strideguide.cam
   ```

3. **Redirect URLs (add all):**
   ```
   https://strideguide.cam/app
   https://strideguide.cam/auth
   https://strideguide.cam/dashboard
   https://www.strideguide.cam/app
   https://www.strideguide.cam/auth
   ```

4. **CORS Allowed Origins:**
   ```
   https://strideguide.cam
   https://www.strideguide.cam
   ```
   - ✅ Enable "Allow credentials"

**Verification:**
- Sign in on `/app` → should redirect back to `/app` (not root)
- Magic link clicks → should land on `/app` without CORS errors

---

### B. Stripe Configuration

**Action Required:** Update Stripe return URLs

1. Go to Stripe Dashboard → Products → Your plans

2. **Update Checkout Success URL:**
   ```
   https://strideguide.cam/app?session_id={CHECKOUT_SESSION_ID}&payment=success
   ```

3. **Update Checkout Cancel URL:**
   ```
   https://strideguide.cam/app?payment=canceled
   ```

4. **Update Billing Portal Return URL:**
   ```
   https://strideguide.cam/app?source=billing_portal
   ```

**Verification:**
- Complete test checkout → lands on `/app` with success param
- Cancel checkout → lands on `/app` with canceled param
- Exit Billing Portal → lands on `/app`

---

### C. DNS & Domain Setup

**Action Required:** Configure DNS for strideguide.cam

1. **A Record (or CNAME):**
   - Point `strideguide.cam` to your hosting provider
   - Point `www.strideguide.cam` to same destination

2. **SSL Certificate:**
   - Ensure HTTPS is enforced for both apex and www
   - No mixed content warnings

3. **Redirects:**
   - Optional: Redirect `www.strideguide.cam` → `strideguide.cam`

---

### D. index.html Manifest Link (Conditional)

**Current State:** Manifest is linked globally in `index.html`

**Recommended Update (Optional):**
If you want the manifest ONLY on `/app` routes:

1. Open `index.html`
2. Remove the global manifest `<link>`:
   ```html
   <link rel="manifest" href="/manifest.json">
   ```
3. Add it conditionally via React in `/app` route:
   ```tsx
   // In src/pages/Index.tsx (the /app page)
   useEffect(() => {
     const link = document.createElement('link');
     link.rel = 'manifest';
     link.href = '/manifest.json';
     document.head.appendChild(link);
     return () => { document.head.removeChild(link); };
   }, []);
   ```

**Why?** Prevents browsers from trying to install PWA from marketing pages.

**Trade-off:** Leaving it global is simpler; browser will only show install if on `/app` anyway due to scope.

---

## 🧪 Smoke Tests

Run these tests after deployment to production:

### 1. Installability
- [ ] Open `https://strideguide.cam/app` on Android Chrome
- [ ] Verify "Add to Home Screen" / install prompt appears
- [ ] Install PWA and confirm it opens to `/app`
- [ ] Open installed PWA → should land on `/app` route

### 2. Routing & Caching
- [ ] Visit `https://strideguide.cam` (home)
- [ ] Open DevTools → Application → Service Workers
- [ ] Verify **no SW registered** for root `/`
- [ ] Click "Open App" CTA → lands on `/app`
- [ ] Verify SW **is registered** with scope `/app`
- [ ] Reload marketing home → still no SW, no stale assets

### 3. Auth Flow
- [ ] Sign in from `/app`
- [ ] Verify redirects back to `/app` (not `/` or `/dashboard`)
- [ ] Sign out and try magic link
- [ ] Click magic link → lands on `/app` without CORS errors
- [ ] Check DevTools Console → no `SameSite` cookie warnings

### 4. Payments Flow
- [ ] Start checkout from `/app`
- [ ] Complete test payment
- [ ] Verify redirect to `/app?session_id=...&payment=success`
- [ ] Open Billing Portal from `/app`
- [ ] Exit portal → verify redirect to `/app`

### 5. UTM Attribution
- [ ] Open `https://strideguide.cam?utm_source=google&utm_medium=cpc&utm_campaign=test`
- [ ] Click "Open App"
- [ ] Open DevTools Console in `/app`
- [ ] Verify log: `[UTM] App entry with attribution: {utm_source: "google", ...}`
- [ ] Check localStorage → `stride_utm_params` should contain UTM data

### 6. Offline Functionality
- [ ] Open `/app` and enable offline mode (DevTools → Network → Offline)
- [ ] Hard refresh → app should load from SW cache
- [ ] Open marketing page offline → should fail gracefully (expected)

### 7. Lighthouse PWA Checks
- [ ] Run Lighthouse on `https://strideguide.cam/app`
- [ ] Verify PWA score ≥ 90
- [ ] Check installability passes
- [ ] Verify manifest start URL = `/app`
- [ ] Verify service worker scope = `/app`

---

## 📊 Analytics Setup (Optional)

If using Google Analytics (gtag.js):

1. Verify `gtag` is loaded in `index.html`
2. Add custom event tracking in `src/utils/utm-tracker.ts` (already implemented)
3. Check GA4 dashboard for `app_entry` events with UTM dimensions

**Test Event:**
```javascript
gtag('event', 'app_entry', {
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'test',
  timestamp: '2025-10-08T12:00:00Z'
});
```

---

## 🚨 Rollback Plan

If issues arise post-deployment:

### Quick Rollback (No DNS Changes)
1. Revert `src/main.tsx` SW scope to `'/'`
2. Revert manifest files to `start_url: "/?source=pwa"` and `scope: "/"`
3. Remove UTM tracker import from `src/pages/Index.tsx`
4. Redeploy (app stays online, PWA works from root)

### Full Rollback
1. Restore previous Git commit
2. Redeploy to Lovable/hosting
3. No DNS changes needed (strideguide.cam stays live)

---

## 📝 Acceptance Criteria

**Ship to production when:**

- ✅ Marketing CTAs ("Open App") route to `/app` consistently
- ✅ Manifest `start_url` and `scope` = `/app`
- ✅ SW registered **only** on `/app` routes
- ✅ Marketing pages have **no SW** registered
- ✅ Auth redirects to `/app` (not `/` or `/dashboard`)
- ✅ Stripe checkout/portal returns to `/app`
- ✅ UTM params captured and tracked in app entry
- ✅ Lighthouse PWA score ≥ 90 on `/app`
- ✅ Install prompt appears on Android/iOS on `/app`
- ✅ No console errors on marketing or app pages
- ✅ Offline mode works for `/app` (cached assets load)

---

## 🎯 Post-Launch Monitoring

**Week 1:**
- Monitor Supabase Auth logs for redirect errors
- Check Stripe webhook logs for return URL failures
- Verify GA4 `app_entry` events have UTM data
- Watch SW cache hit rate in analytics

**Week 2:**
- Run Lighthouse audits on `/app` and `/` (marketing)
- Verify no increase in auth failure rate
- Check for any CORS errors in production logs

**Week 4:**
- Review install conversion rate (marketing → app)
- Check retention for users entering from UTM campaigns
- Optimize CTAs based on click-through data

---

## 📚 Related Documentation

- [CACHE_MANAGEMENT_GUIDE.md](./CACHE_MANAGEMENT_GUIDE.md) - SW debugging
- [AUTH_CONFIGURATION_GUIDE.md](./AUTH_CONFIGURATION_GUIDE.md) - Supabase setup
- [STRIPE_INTEGRATION_VALIDATION.md](./STRIPE_INTEGRATION_VALIDATION.md) - Payment flows

---

**Status:** Ready for deployment 🚀  
**Last Updated:** 2025-10-08  
**Version:** PWA Scope Isolation v1
