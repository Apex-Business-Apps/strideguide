# StrideGuide Production Deployment Runbook

## Pre-Deployment Checklist

### 1. Environment Validation
- [ ] `STRIPE_SECRET_KEY` set in Supabase Edge Function secrets
- [ ] `STRIPE_WEBHOOK_SECRET` set in Supabase Edge Function secrets  
- [ ] `STRIPE_PUBLISHABLE_KEY` verified in client code
- [ ] Database migrations applied successfully
- [ ] All tests passing (unit, integration, critical flows)

### 2. Stripe Configuration
- [ ] Webhook endpoint configured: `https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook events enabled: `customer.subscription.*`, `invoice.payment_*`, `customer.subscription.trial_will_end`
- [ ] Webhook signature secret copied to Supabase secrets
- [ ] Subscription plans created in Stripe dashboard
- [ ] Price IDs match `subscription_plans` table

### 3. Security Validation
- [ ] RLS policies active on all tables
- [ ] Admin authorization uses server-side validation
- [ ] Input validation schemas in place
- [ ] CORS headers configured correctly
- [ ] Rate limiting enabled

## Deployment Steps

### Step 1: Merge to Main
```bash
git checkout main
git merge feature-branch
git push origin main
```

### Step 2: Lovable Auto-Build
- Lovable automatically builds on push to main
- No manual intervention required
- Build takes ~2-3 minutes

### Step 3: Database Migration (if needed)
- Migrations are idempotent and safe to re-run
- Lovable applies migrations automatically
- Verify in Supabase dashboard > SQL Editor

### Step 4: Edge Function Deployment
- Edge functions deploy automatically with build
- Check deployment status in Supabase dashboard > Edge Functions
- Verify logs show no errors

### Step 5: Smoke Tests

#### Test 1: User Signup & Checkout
1. Sign up new user: `test+{timestamp}@strideguide.ca`
2. Navigate to `/pricing`
3. Click "Upgrade Now"
4. Complete Stripe test checkout: Card `4242 4242 4242 4242`
5. Verify redirect to success URL
6. Check `user_subscriptions` table for new record

#### Test 2: Webhook Processing
1. Trigger test webhook from Stripe dashboard
2. Check Supabase logs for webhook function
3. Verify `billing_events` table updated
4. Confirm no signature verification errors

#### Test 3: Billing Portal
1. Log in as subscribed user
2. Navigate to `/dashboard`
3. Click "Billing Portal"
4. Verify redirect to Stripe portal
5. Test subscription update/cancel

#### Test 4: Journey Tracking
1. Start camera guidance
2. Complete 10-second session
3. Query `journey_traces` table
4. Verify `start_guidance` entry with `completed` status

#### Test 5: Settings Save
1. Navigate to `/settings`
2. Toggle any setting
3. Query `journey_traces` for `settings_save`
4. Confirm duration logged

### Step 6: Monitor Initial Traffic
```sql
-- Check for errors in security audit log
SELECT event_type, severity, COUNT(*) 
FROM security_audit_log 
WHERE created_at > now() - interval '1 hour'
GROUP BY event_type, severity
ORDER BY severity DESC;

-- Verify journey success rate
SELECT 
  journey_name,
  status,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms
FROM journey_traces
WHERE created_at > now() - interval '1 hour'
GROUP BY journey_name, status;

-- Check performance metrics
SELECT 
  metric_name,
  percentile,
  AVG(value) as avg_value_ms
FROM performance_metrics
WHERE created_at > now() - interval '1 hour'
GROUP BY metric_name, percentile;
```

## Rollback Procedure

### Immediate Rollback (< 5 minutes)
1. Go to Lovable dashboard
2. Click "History" tab
3. Find previous working version
4. Click "Revert to this version"
5. Confirm revert
6. Lovable auto-deploys previous version

### Verify Rollback
1. Run smoke tests on reverted version
2. Check edge function logs for errors
3. Query `journey_traces` to confirm functionality
4. Notify team in Slack/Discord

### Database Rollback (if needed)
- **Note**: Our migrations are additive only
- New tables remain but are unused in old code
- No data corruption risk
- If rollback needed:
  ```sql
  -- Mark new tables as inactive (don't drop - data preservation)
  -- Example: ALTER TABLE new_table RENAME TO _archived_new_table;
  ```

## Health Checks

### Real-Time Monitoring
```sql
-- Last 5 minutes error count
SELECT COUNT(*) as error_count
FROM security_audit_log
WHERE severity IN ('critical', 'warning')
  AND created_at > now() - interval '5 minutes';

-- Journey failure rate (target: < 5%)
SELECT 
  journey_name,
  ROUND(100.0 * SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) / COUNT(*), 2) as failure_rate_pct
FROM journey_traces
WHERE created_at > now() - interval '1 hour'
GROUP BY journey_name;

-- p95 latency (target: < 500ms)
SELECT 
  journey_name,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_ms
FROM journey_traces
WHERE created_at > now() - interval '1 hour'
  AND status = 'completed'
GROUP BY journey_name;
```

### Edge Function Health
- Supabase Dashboard > Edge Functions > Logs
- Check for 5xx errors
- Verify response times < 2s

## Incident Response

### P0: Critical (Payment Processing Down)
1. Check Stripe dashboard for service status
2. Verify webhook secret matches Supabase
3. Check edge function logs for errors
4. If unresolvable in 10 min → rollback
5. Notify users via status page

### P1: High (Elevated Error Rate)
1. Query `security_audit_log` for patterns
2. Check recent deployments/migrations
3. Review edge function logs
4. If error rate > 10% → rollback
5. Investigate root cause post-rollback

### P2: Medium (Performance Degradation)
1. Check database query performance
2. Review journey traces for slow operations
3. Verify Core Web Vitals
4. Schedule optimization for next sprint

## Communication Templates

### Deployment Notification
```
🚀 StrideGuide v1.0.0 Deployed
- Stripe payments now live
- Journey tracking enabled
- All smoke tests passing
- Monitoring: [Supabase Dashboard Link]
```

### Rollback Notification
```
⚠️ Rollback Initiated - StrideGuide
- Version rolled back to v0.9.5
- Issue: [Brief description]
- Status: [Investigating/Resolved]
- ETA: [Time estimate]
```

### All-Clear Notification
```
✅ StrideGuide Deployment Stable
- Uptime: 100%
- Error rate: < 1%
- p95 latency: 320ms
- Next check: [Time]
```

## Contact Information

- **Primary On-Call**: [Your contact]
- **Stripe Support**: https://support.stripe.com
- **Supabase Support**: https://supabase.com/dashboard/support
- **Status Page**: [Your status page URL]

## SLO Targets

| Metric | Target | Action if Breached |
|--------|--------|-------------------|
| Uptime | 99.5% | Investigate immediately |
| Error rate | < 2% | Review logs, consider rollback |
| p95 latency | < 500ms | Optimize queries, scale resources |
| Checkout success | > 95% | Check Stripe integration |
| Journey completion | > 90% | Review UX, check for errors |

---

**Last Updated**: 2025-01-05  
**Version**: 1.0.0  
**Maintained By**: StrideGuide DevOps Team
