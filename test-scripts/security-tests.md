# Security Test Checklist

## Authentication & Authorization

### ✅ Test 1: Unauthenticated Requests
- [ ] All edge functions reject requests without Authorization header
- [ ] Response code: 401
- [ ] Response body includes error code "AUTH_REQUIRED"

### ✅ Test 2: Invalid Token
- [ ] Edge functions reject invalid/expired tokens
- [ ] Response code: 401
- [ ] Response body includes error code "AUTH_FAILED"

### ✅ Test 3: Admin Privilege Escalation
- [ ] Non-admin users cannot access admin-only functions
- [ ] Server-side validation via `check-admin-access` function
- [ ] No client-side admin checks accepted

### ✅ Test 4: RLS Policy Enforcement
```sql
-- Test as non-admin user
SELECT * FROM user_roles WHERE role = 'admin';
-- Should return 0 rows for non-admin users

-- Test user can only see own data
SELECT * FROM user_settings WHERE user_id != auth.uid();
-- Should return 0 rows
```

## Input Validation

### ✅ Test 5: SQL Injection Prevention
- [ ] All user inputs sanitized via Zod schemas
- [ ] No raw SQL in edge functions
- [ ] Database functions use parameterized queries

### ✅ Test 6: XSS Prevention
- [ ] User-generated content sanitized before display
- [ ] No `dangerouslySetInnerHTML` with user content
- [ ] Content-Security-Policy headers set

### ✅ Test 7: Length Limits
- [ ] AI chat messages capped at 1000 characters
- [ ] Emergency contact names capped at 100 characters
- [ ] All text inputs have max length validation

### ✅ Test 8: Type Validation
```typescript
// Test invalid types rejected
const invalidInputs = [
  { planId: 123 }, // Should be string
  { messages: "not an array" }, // Should be array
  { featureName: null }, // Should be string
];
```

## Rate Limiting

### ✅ Test 9: AI Chat Rate Limit
- [ ] 30 requests/minute enforced
- [ ] 31st request returns 429 status
- [ ] `Retry-After` header present
- [ ] Security audit log entry created

### ✅ Test 10: Checkout Rate Limit
- [ ] 10 checkout requests per 10 minutes
- [ ] 11th request returns 429 status
- [ ] Prevents checkout spam

### ✅ Test 11: Feature Validation Rate Limit
- [ ] 100 requests/minute for premium features
- [ ] 200 requests/minute for default features
- [ ] Rate limit violations logged

## Stripe Security

### ✅ Test 12: Webhook Signature Verification
```bash
# Invalid signature should be rejected
curl -X POST https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=123,v1=invalid" \
  -d '{"type":"customer.subscription.created"}'
# Expected: 400 Bad Request
```

### ✅ Test 13: Webhook Idempotency
- [ ] Duplicate Stripe events ignored
- [ ] `event_id` checked in database before processing
- [ ] No double-charging or duplicate records

### ✅ Test 14: Checkout Idempotency
- [ ] Idempotency key prevents duplicate checkouts
- [ ] Same key returns same session
- [ ] Logged in `stripe_idempotency_log` table

### ✅ Test 15: Price Manipulation
- [ ] Prices fetched server-side from `subscription_plans`
- [ ] Client cannot override prices
- [ ] Plan validation before Stripe call

## Data Protection

### ✅ Test 16: Encryption at Rest
```typescript
// Test EncryptedKV
const kv = new EncryptedKV('test_namespace');
await kv.set('sensitive', { ssn: '123-45-6789' });
const raw = localStorage.getItem('ekv_test_namespace_sensitive');
// Raw value should be encrypted, not plain text
```

### ✅ Test 17: Secure Deletion
- [ ] Emergency contacts deleted via `DELETE` mutation
- [ ] Learned items properly removed
- [ ] No orphaned encrypted data

### ✅ Test 18: Log Sanitization
```typescript
// Sensitive data should be redacted in logs
const sanitized = sanitizers.sanitizeForLogging("My email is test@example.com");
// Should not contain actual email
```

## CORS & Headers

### ✅ Test 19: CORS Preflight
```bash
curl -X OPTIONS https://yrndifsbsmpvmpudglcc.supabase.co/functions/v1/ai-chat \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization"
# Expected: 200 OK with CORS headers
```

### ✅ Test 20: Security Headers
```bash
curl -I https://yourdomain.com
# Should include:
# - Content-Security-Policy
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Referrer-Policy: no-referrer
```

## Session Security

### ✅ Test 21: Session Timeout
- [ ] Supabase sessions expire after inactivity
- [ ] Refresh token rotation enabled
- [ ] No persistent sessions without explicit "remember me"

### ✅ Test 22: Logout Cleanup
- [ ] Auth tokens cleared on logout
- [ ] Encrypted local data remains (offline-first)
- [ ] Session invalidated server-side

## Error Handling

### ✅ Test 23: Error Message Safety
- [ ] No stack traces in production responses
- [ ] Error codes instead of detailed messages
- [ ] Sensitive data not exposed in errors

### ✅ Test 24: Graceful Degradation
- [ ] Offline mode works without network
- [ ] API failures don't crash app
- [ ] Fallback UI for missing data

## Monitoring & Audit

### ✅ Test 25: Security Audit Logging
```sql
-- Verify critical events are logged
SELECT event_type, COUNT(*) 
FROM security_audit_log 
WHERE created_at > now() - interval '1 hour'
GROUP BY event_type;

-- Should include:
-- - rate_limit_exceeded
-- - feature_access_denied
-- - checkout_created
-- - billing_portal_accessed
```

### ✅ Test 26: Journey Tracing
```sql
-- Verify user journeys are tracked
SELECT journey_name, status, COUNT(*) 
FROM journey_traces 
WHERE created_at > now() - interval '1 hour'
GROUP BY journey_name, status;
```

## Acceptance Criteria

All 26 tests must pass before production deployment.

**Current Status**: ⏳ In Progress  
**Last Run**: [Date]  
**Pass Rate**: [X/26]
