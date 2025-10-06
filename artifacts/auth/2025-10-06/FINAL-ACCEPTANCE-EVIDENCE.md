# FINAL ACCEPTANCE EVIDENCE TEMPLATE

**Project**: StrideGuide Production Deployment  
**Date**: 2025-10-06  
**Auditor**: [Your Name]  
**Environment**: Preview (https://strideguide.lovable.app)

---

## Outcome 1: Fix Authentication Preflight/CORS (Preview + Prod)

### B1 - Preflight Must Succeed (OPTIONS)

**Evidence Required**:

1. **Preflight Diagnostic Output**
   ```
   [ ] Screenshot of console output from: await runPreflightDiagnostic()
   [ ] Showing:
       - OPTIONS status: 200 or 204
       - All CORS headers present
       - POST request succeeds (200/400/401 acceptable)
       - No "Failed to fetch" errors
   ```

2. **Network Tab - OPTIONS Request**
   ```
   [ ] Screenshot of Network tab showing OPTIONS request
   [ ] Response headers visible:
       - Access-Control-Allow-Origin: <your-origin>
       - Access-Control-Allow-Methods: POST, OPTIONS
       - Access-Control-Allow-Headers: content-type, authorization
       - Access-Control-Allow-Credentials: true
       - Vary: Origin
   ```

3. **Network Tab - POST Request**
   ```
   [ ] Screenshot of Network tab showing POST to auth endpoint
   [ ] Status: 200, 400, or 401 (NOT network error)
   [ ] Request headers include: Origin, Content-Type
   [ ] Response headers include: Access-Control-Allow-Origin
   ```

4. **HAR File Export** (Optional but recommended)
   ```
   [ ] HAR file showing full OPTIONS + POST sequence
   [ ] Filename: strideguide-auth-preflight-YYYYMMDD.har
   ```

### B2 - Supabase Allowlist Configuration

**Evidence Required**:

1. **Supabase Dashboard Screenshot**
   ```
   [ ] Screenshot of Authentication → URL Configuration page
   [ ] Showing:
       - Site URL: https://strideguide.lovable.app
       - Additional Redirect URLs:
         * https://strideguide.lovable.app/**
         * https://*.lovable.app/**
         * http://localhost:8080/**
         * http://localhost:5173/**
   ```

2. **Configuration Confirmation**
   ```
   [ ] Screenshot showing "Configuration saved successfully" message
   [ ] Timestamp visible
   ```

### B3 - Session Cookie Flags

**Evidence Required**:

1. **DevTools → Application → Cookies**
   ```
   [ ] Screenshot of cookie panel showing:
       - Cookie name: sb-yrndifsbsmpvmpudglcc-auth-token
       - HttpOnly: ✅
       - Secure: ✅ (on HTTPS)
       - SameSite: Lax
       - Expiry: Future date
   ```

2. **Network Tab - Set-Cookie Header**
   ```
   [ ] Screenshot of auth response showing Set-Cookie header
   [ ] Cookie flags visible in header
   ```

3. **Session Persistence Test**
   ```
   [ ] Screenshot of app after browser restart
   [ ] User still logged in (no redirect to auth page)
   ```

### B4 - Actionable Error Messages

**Evidence Required**:

1. **Invalid Credentials Error**
   ```
   [ ] Screenshot showing: "Email or password is incorrect."
   [ ] NOT generic "Network error"
   ```

2. **CORS/Network Error**
   ```
   [ ] Screenshot showing: "Sign-in temporarily unavailable. Please refresh and try again."
   [ ] Console shows correlation ID
   ```

3. **Timeout Error**
   ```
   [ ] Screenshot showing: "Service unreachable. Try again shortly."
   ```

4. **Console Correlation ID**
   ```
   [ ] Console screenshot showing:
       [AUTH-<uuid>] Sign-in attempt started
       [AUTH-<uuid>] CORS/Network failure - check Supabase Auth URL configuration
   ```

---

## Outcome 2: SEO Best Practices

### Meta Tags & Structured Data

**Evidence Required**:

1. **Google Rich Results Test**
   ```
   [ ] Screenshot from https://search.google.com/test/rich-results
   [ ] URL tested: https://strideguide.lovable.app/
   [ ] Showing:
       - MobileApplication schema detected ✅
       - Organization schema detected ✅
       - FAQPage schema detected ✅
       - No errors
   ```

2. **Metatags.io Preview**
   ```
   [ ] Screenshot from https://metatags.io/
   [ ] Showing:
       - OG image renders correctly
       - Title: "StrideGuide - AI Vision Assistant..."
       - Description visible (under 160 chars)
       - Twitter Card preview
   ```

3. **Lighthouse SEO Audit**
   ```
   [ ] Screenshot of Lighthouse SEO score
   [ ] Score: ≥ 90/100
   [ ] All checks passed:
       - Document has <title> ✅
       - Meta description ✅
       - Links descriptive ✅
       - Images have alt ✅
       - Valid hreflang ✅
   ```

4. **Mobile-Friendly Test**
   ```
   [ ] Screenshot from https://search.google.com/test/mobile-friendly
   [ ] Result: "Page is mobile-friendly" ✅
   ```

### Image Alt & Lazy Loading Audit

**Evidence Required**:

1. **Console Audit Output**
   ```
   [ ] Screenshot of console after running image audit script
   [ ] Showing:
       Images without alt text: 0
       Images below fold without lazy loading: 0
   ```

2. **Sample Image Inspection**
   ```
   [ ] Screenshot of DevTools → Elements showing <img> tag
   [ ] Attributes visible:
       - alt="[descriptive text]"
       - loading="lazy" (if below fold)
   ```

---

## Outcome 3: PWA/Security Headers

### Security Headers

**Evidence Required**:

1. **securityheaders.com Report**
   ```
   [ ] Screenshot from https://securityheaders.com/
   [ ] URL tested: https://strideguide.lovable.app/
   [ ] Grade: A or A+
   [ ] Headers present:
       - Strict-Transport-Security ✅
       - X-Content-Type-Options ✅
       - X-Frame-Options ✅
       - Content-Security-Policy ✅
       - Referrer-Policy ✅
   ```

2. **CSP Evaluator**
   ```
   [ ] Screenshot from https://csp-evaluator.withgoogle.com/
   [ ] No high-severity findings
   [ ] Expected warnings: 'unsafe-inline', 'unsafe-eval' (acceptable)
   ```

### Service Worker Cache

**Evidence Required**:

1. **Cache Storage Inspection**
   ```
   [ ] Screenshot of DevTools → Application → Cache Storage
   [ ] Cache name: stride-guide-v3
   [ ] Contents visible:
       - / ✅
       - /manifest.json ✅
       - /assets/*.js ✅
       - /assets/*.css ✅
       - NO /api/* ✅
       - NO /supabase/* ✅
   ```

2. **Offline Test**
   ```
   [ ] Screenshot of app loaded in Airplane Mode
   [ ] Network tab showing: "failed (net::ERR_INTERNET_DISCONNECTED)"
   [ ] App still renders correctly
   ```

3. **Console Logs - Cache Behavior**
   ```
   [ ] Screenshot showing:
       [SW] Cache hit (stale-while-revalidate): /assets/...
       [SW] Path not in allowlist, bypassing cache: /api/...
   ```

---

## Outcome 4: Acceptance Tests

### Quality Gates

**Evidence Required**:

1. **Vision Performance** (if applicable)
   ```
   [ ] mAP@.5 ≥ 0.55 on hazard set
   [ ] Latency ≤ 120ms/frame on Pixel 6 / iPhone 12
   [ ] Screenshots/videos of obstacle detection
   ```

2. **Battery Life** (if applicable)
   ```
   [ ] ≥ 2.5h continuous guidance documented
   [ ] Low-power mode toggles verified
   [ ] Battery drain logs
   ```

3. **A11y Compliance**
   ```
   [ ] Screenshot of screen reader sweep test
   [ ] Focus rings visible on all interactive elements
   [ ] Touch targets ≥ 52dp/pt verified
   [ ] WCAG 2.2 AA contrast passed
   ```

4. **SOS Functionality** (if applicable)
   ```
   [ ] 100% SMS intent delivery (cell only, data off)
   [ ] Screenshot of SMS sent
   [ ] Debounce/cooldown verified
   ```

5. **Localization (EN/FR)**
   ```
   [ ] Screenshot of app in English
   [ ] Screenshot of app in French
   [ ] All strings externalized (no hardcoded text)
   [ ] Offline TTS voices available
   ```

### Critical User Journeys

**Evidence Required for Each Journey**:

1. **Sign Up → Email Verification → Sign In**
   ```
   [ ] Screenshots at each step
   [ ] No errors encountered
   [ ] Session persists after sign-in
   ```

2. **Offline Obstacle Detection** (if applicable)
   ```
   [ ] Video showing obstacle detection in Airplane Mode
   [ ] Voice guidance working
   [ ] Performance acceptable
   ```

3. **Emergency SOS** (if applicable)
   ```
   [ ] Screenshot of SOS trigger
   [ ] SMS intent generated
   [ ] Cooldown prevents spam
   ```

4. **Settings Save & Persistence**
   ```
   [ ] Screenshot of settings page
   [ ] Change setting → Reload page
   [ ] Setting persisted correctly
   ```

5. **Payment Flow** (if applicable)
   ```
   [ ] Screenshots: Pricing → Checkout → Confirmation
   [ ] Stripe webhook received
   [ ] Subscription activated in DB
   ```

---

## Performance & Accessibility

### Lighthouse Audit (Full)

**Evidence Required**:

1. **Overall Scores**
   ```
   [ ] Screenshot of Lighthouse scores
   [ ] Performance: ≥ 90
   [ ] Accessibility: ≥ 95
   [ ] Best Practices: ≥ 90
   [ ] SEO: ≥ 90
   ```

2. **Core Web Vitals**
   ```
   [ ] LCP (Largest Contentful Paint): ≤ 2.5s
   [ ] FID (First Input Delay): ≤ 100ms
   [ ] CLS (Cumulative Layout Shift): ≤ 0.1
   [ ] Screenshots showing actual values
   ```

3. **Bundle Size**
   ```
   [ ] Screenshot of production build output
   [ ] Total bundle size: ≤ 500KB (gzipped)
   ```

---

## Additional Evidence

### Design & Brand Consistency

**Evidence Required**:

1. **Design System Tokens**
   ```
   [ ] Screenshot of index.css showing semantic tokens
   [ ] No hardcoded colors (text-white, bg-white, etc.)
   [ ] Consistent spacing, typography
   ```

2. **Component Screenshots**
   ```
   [ ] Landing page (desktop)
   [ ] Landing page (mobile)
   [ ] Auth page
   [ ] Dashboard/main app
   [ ] All using semantic tokens from design system
   ```

### Edge Function Security

**Evidence Required**:

1. **CORS Configuration**
   ```
   [ ] Screenshot of supabase/functions/_shared/cors.ts
   [ ] ALLOWED_ORIGINS array visible (no wildcard)
   ```

2. **Edge Function Logs**
   ```
   [ ] Screenshot of Supabase → Functions → Logs
   [ ] No errors
   [ ] Successful requests visible
   ```

---

## Submission Checklist

### Documentation
- [ ] All screenshots labeled with date/time
- [ ] All console outputs include correlation IDs
- [ ] All evidence organized by outcome (B1, B2, B3, B4, SEO, PWA, Tests)
- [ ] Root cause documented for any failures

### Files to Submit
- [ ] All screenshots (PNG format, high resolution)
- [ ] HAR files for auth flows
- [ ] Console logs (text files or screenshots)
- [ ] Lighthouse reports (JSON exports)
- [ ] Video recordings of critical journeys (MP4, <50MB each)

### Sign-Off
- [ ] All acceptance criteria met
- [ ] No critical issues outstanding
- [ ] Minor issues documented with mitigation plan
- [ ] Production deployment approved

---

## Notes Section

**Tester Notes**:
```
[Add any observations, edge cases discovered, or recommendations here]
```

**Known Issues (Non-Blocking)**:
```
[List any minor issues that don't block deployment]
```

**Follow-Up Actions**:
```
[List any post-deployment monitoring or improvements planned]
```

---

## Approval

**Tested By**: _______________________  
**Date**: _______________________  
**Environment**: Preview / Production  
**Status**: ✅ APPROVED / ⚠️ CONDITIONAL / ❌ REJECTED  

**Approver**: _______________________  
**Date**: _______________________  
**Notes**: _______________________

---

**END OF EVIDENCE TEMPLATE**
