# Production Deployment Checklist

## Pre-Deployment Security & Configuration

### 1. Landing Page Baseline ✅
- [x] Landing page design frozen (see `docs/LANDING_PAGE_BASELINE.md`)
- [x] Visual changes blocked (layout, colors, spacing)
- [x] Copy updates and link wiring allowed

### 2. Authentication Configuration ⚠️
**YOU MUST CONFIGURE MANUALLY IN SUPABASE DASHBOARD**

#### Required Settings:
- [ ] **Site URL** set to production domain
  - Location: Supabase Dashboard → Authentication → URL Configuration
  - Value: `https://your-production-domain.com`

- [ ] **Redirect URLs** configured
  - Location: Supabase Dashboard → Authentication → URL Configuration
  - Add ALL deployment URLs:
    - `https://your-production-domain.com/*`
    - `https://your-preview.lovable.app/*`
    - `https://your-production-domain.com/auth`

- [ ] **Email confirmation** ENABLED for production
  - Location: Supabase Dashboard → Authentication → Providers → Email
  - ⚠️ Disable only for testing, re-enable before launch

#### Acceptance Test:
- [ ] Sign in returns auth response (not "Failed to fetch")
- [ ] New user signup completes successfully
- [ ] Password reset email sends correctly

### 3. CORS Configuration ⚠️
**YOU MUST UPDATE ALLOWED ORIGINS**

#### File to Edit:
`supabase/functions/_shared/cors.ts`

#### Required Changes:
```typescript
export const ALLOWED_ORIGINS = [
  'https://yrndifsbsmpvmpudglcc.supabase.co',
  'https://your-preview.lovable.app',        // ADD THIS
  'https://your-production-domain.com',      // ADD THIS
];
```

#### Acceptance Test:
- [ ] Browser Network tab shows 2xx/4xx responses (no CORS errors)
- [ ] All edge function calls succeed from production domain
- [ ] OPTIONS preflight requests return 200

### 4. Environment Variables & Secrets ✅
- [x] All Supabase secrets configured
- [x] Stripe keys configured
- [x] OpenAI API key configured
- [ ] Review and rotate keys if needed for production

### 5. Edge Functions Security ✅
- [x] Rate limiting enabled on all functions
- [x] Authentication required on protected endpoints
- [x] Input validation on all user inputs
- [x] Security audit logging enabled
- [ ] Review logs before launch

### 6. Database Security
- [ ] Run RLS policy audit
- [ ] Verify all tables have appropriate policies
- [ ] Test access controls with non-admin user
- [ ] Review `security_audit_log` table

### 7. Frontend Security Headers
- [ ] Review `_headers` file
- [ ] Verify CSP policy includes all required domains
- [ ] Test in browser with strict CSP enabled

### 8. Performance & Monitoring
- [ ] Enable error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure analytics (privacy-respecting)
- [ ] Test PWA installation flow

### 9. Content & Legal
- [ ] Privacy policy complete
- [ ] Terms of service finalized
- [ ] GDPR/PIPEDA compliance reviewed
- [ ] Cookie consent (if applicable)

### 10. Testing Matrix
- [ ] Test on iPhone Safari
- [ ] Test on Android Chrome
- [ ] Test screen reader navigation (VoiceOver/TalkBack)
- [ ] Test offline functionality
- [ ] Test emergency SOS flow
- [ ] Test subscription checkout
- [ ] Test admin dashboard access

## Post-Deployment

### Immediate
- [ ] Verify production auth works
- [ ] Test edge function CORS from production
- [ ] Monitor error logs for first hour
- [ ] Test critical user flows

### Within 24 Hours
- [ ] Review `security_audit_log` for anomalies
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Test from multiple devices/locations

### Within 1 Week
- [ ] User feedback collection
- [ ] Performance optimization review
- [ ] Security scan review
- [ ] Database query optimization

## Emergency Rollback Plan
1. Revert to previous deployment
2. Restore database to snapshot (if needed)
3. Notify users via status page
4. Document incident in post-mortem

## Support Contacts
- Supabase Support: support@supabase.io
- Stripe Support: support@stripe.com
- Lovable Discord: [Community link]

---

**Remember**: Test everything in preview/staging BEFORE production deploy!
