# T9: QA Critical Journeys

## Objective
Execute end-to-end critical user journeys and validate production readiness.

---

## Critical Journey 1: Start Guidance (Offline-First)

### User Story
*As a vision-impaired user, I want to start obstacle detection guidance so I can navigate safely.*

### Pre-conditions
- User logged in
- Camera permission granted
- Device: Pixel 6 or iPhone 12 equivalent
- Network: Airplane mode ON (offline test)

### Test Steps
1. Open app (offline mode)
2. Tap "Start Guidance" button
3. Observe camera activation
4. Walk toward obstacle (chair, wall)
5. Listen for audio alert

### Expected Results
- ✅ Button responds within 300ms
- ✅ Camera activates within 1s
- ✅ ML model loads from cache (offline)
- ✅ Obstacle detected within 2m range
- ✅ Audio alert: "Obstacle ahead, 1.5 meters" within 200ms of detection
- ✅ Haptic feedback on detection
- ✅ No crashes, no network errors

### Validation Queries
```sql
-- Check journey trace
SELECT journey_name, status, duration_ms, error_message
FROM journey_traces
WHERE journey_name = 'start_guidance'
AND user_id = auth.uid()
ORDER BY created_at DESC LIMIT 1;

-- Check performance metric
SELECT metric_name, value, percentile
FROM performance_metrics
WHERE metric_name = 'guidance_start_time'
AND user_id = auth.uid()
ORDER BY created_at DESC LIMIT 1;
```

### Acceptance Criteria
- [ ] Offline mode fully functional
- [ ] P95 latency <3000ms
- [ ] Error rate <5%
- [ ] Battery drain <15% per hour
- [ ] Accessibility: VoiceOver/TalkBack compatible

---

## Critical Journey 2: Find Item (On-Device ML)

### User Story
*As a blind user, I want to find my keys so I can locate frequently misplaced items.*

### Pre-conditions
- User has "learned" item (keys photo uploaded)
- Camera permission granted
- Network: Online or offline

### Test Steps
1. Navigate to "Find Item"
2. Select "Keys" from learned items
3. Point camera at scene with keys
4. Wait for detection
5. Follow audio guidance to item

### Expected Results
- ✅ Camera activates within 1s
- ✅ Object detection runs on-device (no network calls)
- ✅ Keys detected with confidence >0.85
- ✅ Audio: "Keys detected, 45 degrees right, 2 feet away"
- ✅ Direction guidance updates as user moves
- ✅ Haptic pulse when item is in center frame

### Validation Queries
```sql
-- Check learned item exists
SELECT id, name, confidence_threshold, photos_count
FROM learned_items
WHERE user_id = auth.uid() AND name = 'Keys';

-- Check journey completion
SELECT status, duration_ms, metadata
FROM journey_traces
WHERE journey_name = 'find_item'
AND user_id = auth.uid()
ORDER BY created_at DESC LIMIT 1;
```

### Acceptance Criteria
- [ ] Works offline (on-device inference only)
- [ ] Detection latency <500ms per frame
- [ ] Confidence threshold configurable (0.55–0.95)
- [ ] False positive rate <10%
- [ ] No image data leaves device

---

## Critical Journey 3: Emergency SOS + Recording

### User Story
*As a senior user, I want to trigger SOS if I fall so my emergency contacts are notified.*

### Pre-conditions
- Emergency contacts configured (min 1)
- Location permission granted
- Network: Online

### Test Steps
1. Simulate fall (shake device hard) OR press SOS button
2. Observe countdown (5s before auto-trigger)
3. Allow auto-trigger (don't cancel)
4. Verify audio recording starts
5. Check emergency contact receives SMS
6. Verify location shared in message

### Expected Results
- ✅ Fall detected (accelerometer threshold met)
- ✅ 5-second countdown with audio + haptic warnings
- ✅ SOS triggered automatically if not canceled
- ✅ Audio recording starts (max 2 minutes)
- ✅ SMS sent to all emergency contacts within 10s
- ✅ SMS contains: user name, location (lat/lon or address), timestamp
- ✅ Recording saved to `emergency_recordings` table

### Validation Queries
```sql
-- Check emergency recording created
SELECT id, session_id, recording_type, status, duration_seconds, contacts_notified
FROM emergency_recordings
WHERE user_id = auth.uid()
ORDER BY created_at DESC LIMIT 1;

-- Check security audit log
SELECT event_type, severity, event_data
FROM security_audit_log
WHERE user_id = auth.uid()
AND event_type IN ('sos_triggered', 'emergency_recording_started')
ORDER BY created_at DESC LIMIT 2;
```

### Acceptance Criteria
- [ ] Fall detection sensitivity configurable
- [ ] 100% SMS delivery (cell-only, no data required)
- [ ] Recording encrypted at rest
- [ ] No audio recording without SOS trigger
- [ ] Cancel button stops sequence

---

## Critical Journey 4: Settings Persistence

### User Story
*As a user with motor impairments, I want my settings saved so I don't reconfigure every session.*

### Pre-conditions
- User logged in
- Settings previously configured

### Test Steps
1. Navigate to Settings
2. Change:
   - Voice speed: 1.2
   - Volume: 0.9
   - High contrast mode: ON
   - Large text mode: ON
   - Haptic feedback: OFF
3. Tap "Save Settings"
4. Close app completely (force quit)
5. Reopen app
6. Navigate to Settings again

### Expected Results
- ✅ All changes persisted after reload
- ✅ Settings applied immediately on app start (no lag)
- ✅ Save completes in <800ms
- ✅ Success toast: "Settings saved"

### Validation Queries
```sql
SELECT 
  voice_speed, 
  volume_level, 
  high_contrast_mode, 
  large_text_mode, 
  haptic_feedback_enabled,
  updated_at
FROM user_settings
WHERE user_id = auth.uid();
```

### Acceptance Criteria
- [ ] Settings persist across sessions
- [ ] Settings sync across devices (if multi-device)
- [ ] No settings loss on app crash
- [ ] Validation prevents invalid values (e.g., volume >1.0)

---

## Critical Journey 5: Subscription Upgrade (End-to-End)

### User Story
*As a user, I want to upgrade to Premium so I can access advanced features.*

### Pre-conditions
- User logged in
- Feature flag `enablePayments` = true
- No active subscription

### Test Steps
1. Navigate to Pricing page
2. Click "Upgrade to Premium"
3. Redirected to Stripe Checkout
4. Enter test card: `4242 4242 4242 4242`
5. Complete payment
6. Redirected back to app (success URL)
7. Wait for webhook (max 30s)
8. Refresh app
9. Verify "Premium" badge visible
10. Access premium feature (e.g., cloud describe)

### Expected Results
- ✅ Checkout session created in <2s
- ✅ Stripe Checkout loads with correct plan & price
- ✅ Payment succeeds
- ✅ Redirect to success URL
- ✅ Webhook `customer.subscription.created` received
- ✅ Subscription status = 'active' in DB
- ✅ Premium features unlocked
- ✅ Badge shows "Premium - active"

### Validation Queries
```sql
-- Check subscription created
SELECT 
  us.status, 
  us.stripe_subscription_id, 
  sp.name as plan_name,
  us.current_period_end
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = auth.uid()
ORDER BY us.created_at DESC LIMIT 1;

-- Check billing event recorded
SELECT stripe_event_id, event_type, status, amount, currency
FROM billing_events
WHERE user_id = auth.uid()
AND event_type = 'invoice.payment_succeeded'
ORDER BY created_at DESC LIMIT 1;

-- Check security audit
SELECT event_type, event_data
FROM security_audit_log
WHERE user_id = auth.uid()
AND event_type LIKE 'subscription_%'
ORDER BY created_at DESC LIMIT 3;
```

### Acceptance Criteria
- [ ] Checkout idempotent (duplicate clicks don't create multiple sessions)
- [ ] Webhook signature verified
- [ ] Subscription state updated within 30s of payment
- [ ] Premium features gated by subscription status
- [ ] No client-side secret keys exposed

---

## Critical Journey 6: Billing Portal (Manage Subscription)

### User Story
*As a Premium user, I want to cancel my subscription so I can manage my billing.*

### Pre-conditions
- User has active Premium subscription
- Feature flag `enableWebhooks` = true

### Test Steps
1. Navigate to Settings → "Manage Subscription"
2. Click "Manage Billing"
3. Redirected to Stripe Billing Portal
4. Click "Cancel Plan"
5. Confirm cancellation
6. Verify "cancel at period end" set
7. Return to app
8. Refresh app
9. Verify badge shows "Premium - canceling"

### Expected Results
- ✅ Portal session created in <2s
- ✅ Stripe Billing Portal loads
- ✅ Current plan visible with correct price
- ✅ Cancellation confirmation displayed
- ✅ Webhook `customer.subscription.updated` received
- ✅ DB: `cancel_at_period_end = true`
- ✅ Premium features remain active until period end
- ✅ Badge updated to reflect canceling status

### Validation Queries
```sql
SELECT 
  status, 
  cancel_at_period_end, 
  current_period_end,
  updated_at
FROM user_subscriptions
WHERE user_id = auth.uid()
ORDER BY updated_at DESC LIMIT 1;

-- Check webhook logged
SELECT stripe_event_id, event_type
FROM billing_events
WHERE user_id = auth.uid()
AND stripe_event_id LIKE 'evt_%'
ORDER BY created_at DESC LIMIT 1;
```

### Acceptance Criteria
- [ ] Portal session idempotent
- [ ] Cancellation does not revoke access immediately
- [ ] User can reactivate before period end
- [ ] Webhook updates subscription state
- [ ] Return URL redirects back to app

---

## Test Execution Summary

| Journey | Status | Error Rate | P95 (ms) | Tester | Date | Notes |
|---------|--------|-----------|----------|--------|------|-------|
| Start Guidance | ⏳ | - | - | - | - | - |
| Find Item | ⏳ | - | - | - | - | - |
| Emergency SOS | ⏳ | - | - | - | - | - |
| Settings Save | ⏳ | - | - | - | - | - |
| Subscription Upgrade | ⏳ | - | - | - | - | - |
| Billing Portal | ⏳ | - | - | - | - | - |
