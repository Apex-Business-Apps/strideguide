# StrideGuide Comprehensive Code Audit Report
**Date:** November 14, 2025  
**Scope:** Complete codebase analysis of TypeScript/React application  
**Severity Distribution:** 2 Critical, 8 High, 15 Medium, 8 Low

---

## CRITICAL ISSUES

### 1. Hardcoded API Key in Source Code
**File:** `/home/user/strideguide/src/integrations/supabase/client.ts`  
**Line:** 7  
**Severity:** CRITICAL  
**Category:** Security Issue

```typescript
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmRpZnNic21wdm1wdWRnbGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjA1NDUsImV4cCI6MjA3NDYzNjU0NX0.OBtOjMTiZrgV08ttxiIeT48_ITJ_C88gz_kO-2eLUEk";
```

**Description:** A Supabase JWT token/API key is hardcoded as a fallback value in the source code. While Supabase anonymous keys have limited permissions via RLS, this is still a security risk:
- Allows bad actors to identify the project
- If permissions are ever broadened, credentials are exposed
- Violates security best practices

**Recommended Fix:**
- Remove the hardcoded fallback completely
- Ensure environment variables are always provided at build time
- Add build-time check to fail if VITE_SUPABASE_ANON_KEY is missing
- Consider using a build script to validate environment setup

---

### 2. TypeScript Configuration: Critical Type Safety Disabled
**File:** `/home/user/strideguide/tsconfig.json` and `/home/user/strideguide/tsconfig.app.json`  
**Severity:** CRITICAL  
**Category:** Code Quality Issue

**Configuration Issues:**
```json
{
  "noImplicitAny": false,           // ❌ Allows implicit any types
  "noUnusedParameters": false,       // ❌ Unused parameters ignored
  "skipLibCheck": true,              // ❌ Skips type checking of dependencies
  "strictNullChecks": false,         // ❌ Null/undefined safety disabled
  "noFallthroughCasesInSwitch": false, // ❌ No fallthrough detection
  "strict": false,                   // ❌ All strict checks disabled
  "noUnusedLocals": false            // ❌ Unused variables ignored
}
```

**Description:** The entire TypeScript strict mode is disabled, eliminating type safety:
- 154+ instances of `any` or `unknown` types without proper narrowing
- Null pointer exceptions not caught at compile time
- Dead code and unused variables not detected
- Makes refactoring dangerous

**Recommended Fix:**
```json
{
  "noImplicitAny": true,
  "noUnusedParameters": true,
  "skipLibCheck": false,
  "strictNullChecks": true,
  "strict": true,
  "noUnusedLocals": true,
  "noFallthroughCasesInSwitch": true
}
```
- Then fix all type errors in codebase
- Use type narrowing with `as const` or type guards

---

## HIGH PRIORITY ISSUES

### 3. Dev Auth Bypass with URL Parameter Override
**File:** `/home/user/strideguide/src/config/dev.ts`  
**Lines:** 36-41  
**Severity:** HIGH  
**Category:** Security Issue

```typescript
const bypassParam = params.get('dev_bypass');

if (bypassParam === '1') {
  (DEV_CONFIG as WritableConfig).BYPASS_AUTH = true;
  console.warn('⚠️ DEV MODE: Bypass forced via ?dev_bypass=1');
}
```

**Description:** Authentication can be bypassed by adding `?dev_bypass=1` to the URL. This is dangerous because:
- Can be exploited to skip authentication in production
- The host check is not bulletproof (lovableproject.com can be spoofed)
- No user-facing warning that auth is disabled
- Violates principle of least privilege

**Recommended Fix:**
- Remove URL parameter override completely
- Use environment variables only for dev bypass
- Only enable in truly local development (localhost only)
- Add explicit consent/warning in UI if bypass is enabled
- Remove this capability from production builds entirely

---

### 4. Promise Chains with Empty Error Handlers
**File:** `/home/user/strideguide/src/sw/register.ts`  
**Lines:** 11, 15, 31  
**Severity:** HIGH  
**Category:** Runtime Error

```typescript
Promise.all(regs.map(r => r.unregister())).catch(() => {}); // Silent failure
Promise.all(names.map(name => caches.delete(name))).catch(() => {}); // Silent failure
r.unregister().catch(() => {}); // Silent failure
```

**Description:** Multiple promise chains silently ignore all errors with empty catch handlers:
- Failed service worker unregistration goes unnoticed
- Cache clearing failures are hidden
- Makes debugging extremely difficult
- Could leave orphaned service workers

**Recommended Fix:**
```typescript
Promise.all(regs.map(r => r.unregister()))
  .catch(err => console.warn('[SW] Failed to unregister:', err));
```

---

### 5. Missing Error Handling in Speech Synthesis
**File:** `/home/user/strideguide/src/hooks/useEmergencyRecording.ts`  
**Lines:** 163, 204  
**Severity:** HIGH  
**Category:** Runtime Error

```typescript
const utterance = new SpeechSynthesisUtterance('Emergency recording started');
speechSynthesis.speak(utterance);  // No error handling
```

**Description:** Speech synthesis is used without:
- Checking if `window.speechSynthesis` exists before use
- Handling speechSynthesis errors
- Catching potential exceptions
- Verifying browser support

This could crash in environments without speech synthesis support.

**Recommended Fix:**
```typescript
if ('speechSynthesis' in window && window.speechSynthesis) {
  try {
    const utterance = new SpeechSynthesisUtterance('Emergency recording started');
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('[ERM] Speech synthesis failed:', err);
  }
}
```

---

### 6. Non-null Assertions Without Runtime Checks
**File:** `/home/user/strideguide/src/hooks/useAudioGuidance.ts`  
**Lines:** 122, 167  
**Severity:** HIGH  
**Category:** Runtime Error

```typescript
envelope.connect(gainNodeRef.current!);  // Line 122 - forced non-null
envelope.connect(gainNodeRef.current!);  // Line 167 - forced non-null
```

**Description:** Non-null assertions (!) force TypeScript to ignore null checks:
- gainNodeRef.current might be null during early lifecycle
- No runtime guard prevents null pointer exception
- Makes code fragile and error-prone

**Recommended Fix:**
```typescript
if (gainNodeRef.current) {
  envelope.connect(gainNodeRef.current);
} else {
  console.error('Gain node not initialized');
  return; // Fallback
}
```

---

### 7. Canvas Context Non-null Assertions
**File:** `/home/user/strideguide/src/components/VisionPanel.tsx`  
**Line:** 29  
**Severity:** HIGH  
**Category:** Runtime Error

```typescript
const ctx = c.getContext('2d', { willReadFrequently: true })!;
ctx.drawImage(v, 0, 0, w, h);
```

**Description:** Canvas context is assumed non-null with `!` operator:
- `getContext()` can return null in some browsers/scenarios
- No fallback if context fails to initialize
- Will crash at runtime with "Cannot read property of null"

**Recommended Fix:**
```typescript
const ctx = c.getContext('2d', { willReadFrequently: true });
if (!ctx) {
  console.error('[VisionPanel] Failed to get canvas context');
  return null;
}
ctx.drawImage(v, 0, 0, w, h);
```

---

### 8. ESLint Rule Disabled - No Unused Variable Detection
**File:** `/home/user/strideguide/eslint.config.js`  
**Line:** 23  
**Severity:** HIGH  
**Category:** Code Quality

```javascript
rules: {
  "@typescript-eslint/no-unused-vars": "off",  // Disabled!
}
```

**Description:** ESLint rule for detecting unused variables is disabled:
- Dead code accumulates over time
- Imports of unused dependencies inflate bundle size
- Makes refactoring dangerous (can't tell if code is used)
- Violates code quality standards

**Recommended Fix:**
```javascript
rules: {
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_"
    }
  ],
}
```

---

### 9. Missing Error Handling in App.tsx Auth Setup
**File:** `/home/user/strideguide/src/App.tsx`  
**Line:** 131  
**Severity:** HIGH  
**Category:** Runtime Error

```typescript
supabase.auth.getSession().then(({ data: { session }, error }) => {
  // Error handling inside callback, but outer promise has no error handler
}).catch(() => {
  // Empty catch - silently ignores all errors
});
```

**Description:** Promise rejection in auth setup is silently ignored:
- Auth failures go unnoticed
- App might enter inconsistent state
- No visibility into auth problems during debugging

**Recommended Fix:**
```typescript
supabase.auth.getSession()
  .then(({ data: { session }, error }) => {
    if (error) {
      logger.error('Failed to get session:', error);
      return;
    }
    // Handle session...
  })
  .catch(err => {
    logger.error('Session fetch failed:', err);
    setIsLoading(false);
  });
```

---

### 10. Fetch Calls Without Proper Error Handling
**Files:** Multiple
- `/home/user/strideguide/src/config/runtime.ts:63`
- `/home/user/strideguide/src/lib/supabaseClient.ts:16`
- `/home/user/strideguide/src/utils/OfflineQueue.ts:205`

**Severity:** HIGH  
**Category:** Runtime Error

**Issue:** Fetch calls don't validate response types before parsing JSON:
```typescript
const response = await fetch('/config/runtime.json', { ... });
const config = await response.json(); // Could fail if response is not JSON
```

**Recommended Fix:**
```typescript
const response = await fetch('/config/runtime.json', { ... });
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
const contentType = response.headers.get('content-type');
if (!contentType?.includes('application/json')) {
  throw new Error('Response is not JSON');
}
const config = await response.json();
```

---

## MEDIUM PRIORITY ISSUES

### 11. Large Bundle Chunk Size Warning Limit
**File:** `/home/user/strideguide/vite.config.ts`  
**Line:** 23  
**Severity:** MEDIUM  
**Category:** Performance Issue

```typescript
chunkSizeWarningLimit: 1000,  // 1000 KB = 1 MB (too high)
```

**Description:** Chunk size limit is set to 1MB, very permissive:
- Default is 500KB, which is already high
- Indicates potential large bundle issues being ignored
- Large chunks hurt initial page load performance
- On mobile networks, impacts user experience significantly

**Recommended Fix:**
```typescript
chunkSizeWarningLimit: 500,  // Keep default
// Or fix the actual bundle size issue instead
```

---

### 12. useMLInference Callback Race Condition Risk
**File:** `/home/user/strideguide/src/hooks/useMLInference.ts`  
**Lines:** 211-212, 272  
**Severity:** MEDIUM  
**Category:** Runtime Error

```typescript
if (busyRef.current >= SAFETY.MAX_CONCURRENT_INFER) return null;
busyRef.current++;  // No atomic operation guarantee
```

**Description:** busyRef counter is not atomic:
- Race conditions possible in concurrent executions
- Multiple inference calls might exceed MAX_CONCURRENT_INFER
- Could cause memory exhaustion

**Recommended Fix:**
- Use a proper queue system instead of counter
- Or use a semaphore/lock mechanism
- Consider using @reduxjs/toolkit's createAsyncThunk which handles queueing

---

### 13. Dependency Array Issue in useEmergencyRecording
**File:** `/home/user/strideguide/src/hooks/useEmergencyRecording.ts`  
**Line:** 258  
**Severity:** MEDIUM  
**Category:** Runtime Error (Stale Closures)

```typescript
}, [settings.voiceActivation, isInitialized, startRecording]);
```

**Description:** The `startRecording` dependency will cause infinite re-renders:
- startRecording depends on [policy, isRecording, settings]
- Voice activation effect depends on startRecording
- When settings change, effect re-runs and changes startRecording
- Creates a cycle that could cause memory issues

**Recommended Fix:**
```typescript
}, [settings.voiceActivation, isInitialized]);
// Remove startRecording from dependencies
// Or memoize startRecording with useCallback
```

---

### 14. Missing Validation in CSRF Token Endpoint
**File:** `/home/user/strideguide/supabase/functions/csrf-token/index.ts`  
**Line:** 27  
**Severity:** MEDIUM  
**Category:** Security Issue

```typescript
headers: { Authorization: req.headers.get('Authorization')! },  // Force non-null
```

**Description:** Authorization header is forced non-null without verification:
- Could create an invalid supabase client if header is missing
- Should be validated earlier

---

### 15. Console Logging in Production
**File:** `/home/user/strideguide/src/main.tsx`  
**Line:** 27  
**Severity:** MEDIUM  
**Category:** Configuration Issue

```typescript
console.log('[App] SW registration initialized, version:', SW_VERSION);
```

**Description:** Multiple console.log statements throughout codebase:
- While Vite removes them in production, leaving them is risky
- Should use proper logger instead
- Makes debugging harder

---

### 16. ProductionLogger.sendToMonitoringService Unhandled
**File:** `/home/user/strideguide/src/utils/ProductionLogger.ts`  
**Line:** 100-111  
**Severity:** MEDIUM  
**Category:** Runtime Error

```typescript
private async sendToMonitoringService(entry: LogEntry): Promise<void> {
  try {
    await fetch('/api/logs', { ... });
  } catch (error) {
    console.error('Failed to send log...'); // Silently swallows error
  }
}
```

**Description:** Error in logging service is silently ignored:
- If monitoring service fails, no one knows
- Error logs might be lost
- No retry mechanism

---

### 17. ServiceWorker Registration Error Handling
**File:** `/home/user/strideguide/src/sw/register.ts`  
**Line:** 52  
**Severity:** MEDIUM  
**Category:** Runtime Error

```typescript
}).catch(err => {
  console.warn('[SW] Registration failed:', err);
});
```

**Description:** Service worker registration failure logged but not acted upon:
- App continues as if SW registered successfully
- Offline functionality might not work
- No fallback or user notification

---

### 18. useMLInference Model Loading Without Fallback
**File:** `/home/user/strideguide/src/hooks/useMLInference.ts`  
**Lines:** 66-70  
**Severity:** MEDIUM  
**Category:** Runtime Error

```typescript
try {
  detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
} catch (err) {
  console.error('[useMLInference] Failed to load detector:', err);
  throw new Error('Failed to load object detection model');
}
```

**Description:** Model loading failure crashes app with no graceful degradation:
- Network issues during model load prevent app startup
- No offline model option
- No user-friendly error message

---

### 19. DEV_CONFIG Usage in ConsentModal
**File:** `/home/user/strideguide/src/components/ConsentModal.tsx`  
**Lines:** 28-35  
**Severity:** MEDIUM  
**Category:** Configuration Issue

```typescript
if (DEV_CONFIG.BYPASS_AUTH) {
  const consent = { ... };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  setOpen(false);
}
```

**Description:** Consent modal bypassed in dev mode:
- Makes it harder to test consent flow
- Could be accidentally left enabled
- Masks real issues with consent handling

---

### 20. localStorage Used for Sensitive Config
**File:** Multiple files
**Severity:** MEDIUM  
**Category:** Security Issue

localStorage is used for storing:
- Policy configuration
- Consent status
- Session data
- Queue of pending requests

**Issue:** localStorage is susceptible to:
- XSS attacks if page is compromised
- No encryption by default
- Accessible to any script on the same domain

**Recommended Fix:**
- Use IndexedDB with encryption for sensitive data
- Implement proper storage isolation
- Add Content Security Policy headers

---

## LOW PRIORITY ISSUES

### 21. TypeScript Configuration: noFallthroughCasesInSwitch Disabled
**File:** `/home/user/strideguide/tsconfig.app.json`  
**Severity:** LOW  
**Category:** Code Quality

**Description:** Switch statement fallthrough not detected
- Could mask logic bugs
- Easy to accidentally fall through cases

**Recommended Fix:**
```json
"noFallthroughCasesInSwitch": true
```

---

### 22. VisionPanel Heading Hierarchy
**File:** `/home/user/strideguide/src/components/VisionPanel.tsx`  
**Line:** 96  
**Severity:** LOW  
**Category:** Accessibility

```typescript
<h1 className="text-xl font-semibold">Vision Guidance</h1>
```

**Description:** h1 used in a sub-component, not page root:
- Violates heading hierarchy (should be h2 or h3)
- Could confuse screen readers
- Makes page outline confusing

---

### 23. Missing Timeout in Fetch Operations
**File:** `/home/user/strideguide/src/config/runtime.ts`  
**Severity:** LOW  
**Category:** Performance Issue

```typescript
const response = await fetch('/config/runtime.json', {
  cache: 'no-store',
  headers: { 'Accept': 'application/json' }
});
```

**Description:** Fetch has no timeout:
- Could hang indefinitely if server is unreachable
- App startup could be blocked
- No user-friendly timeout behavior

---

### 24. Navigation Using window.history.back()
**File:** `/home/user/strideguide/src/App.tsx`  
**Lines:** 195-196  
**Severity:** LOW  
**Category:** User Experience

```typescript
<Route path="/pricing" element={<PricingPage onBack={() => window.history.back()} />} />
<Route path="/help" element={<HelpPage onBack={() => window.history.back()} />} />
```

**Description:** Using window.history.back() instead of React Router navigation:
- Doesn't work if page is accessed directly
- Inconsistent with SPA routing
- Could break back button behavior

**Recommended Fix:**
```typescript
const navigate = useNavigate();
<Button onClick={() => navigate(-1)}>Back</Button>
```

---

### 25. Logo Transform Scale
**File:** `/home/user/strideguide/src/components/Logo.tsx`  
**Line:** 18  
**Severity:** LOW  
**Category:** Code Quality

```typescript
transform: 'scaleX(1.15)'
```

**Description:** Logo is scaled by 115% in X direction:
- Distorts aspect ratio
- Might look better if actual SVG is properly proportioned
- Inline styles should be moved to CSS classes

---

### 26. Session State Type Too Loose
**File:** `/home/user/strideguide/src/App.tsx`  
**Line:** 63  
**Severity:** LOW  
**Category:** Code Quality

```typescript
const [session, setSession] = useState<unknown>(null);
```

**Description:** Session typed as `unknown` instead of `Session | null`:
- Loses type safety throughout component
- Should use proper Supabase Session type

---

### 27. Missing Alt Text Validation
**File:** `/home/user/strideguide/src/components/CameraView.tsx`  
**Severity:** LOW  
**Category:** Accessibility

**Description:** Camera stream auto-plays without accessible label:
- Consider adding aria-label for screen readers
- Video element should have descriptive attributes

---

### 28. Empty .env File
**File:** `/home/user/strideguide/.env`  
**Severity:** LOW  
**Category:** Configuration

**Description:** Empty .env file exists in repo:
- Suggests secrets might be stored locally
- .env should never be in version control
- Consider using .env.local in .gitignore

---

## SUMMARY OF RECOMMENDATIONS

### Immediate Actions (Critical Priority)
1. Remove hardcoded API keys from source code
2. Enable TypeScript strict mode and fix errors
3. Remove URL parameter auth bypass
4. Add proper error handling to promise chains
5. Fix speech synthesis usage without checks

### Short-term Actions (High Priority)
6. Implement proper ESLint rules
7. Add error handlers to all fetch calls
8. Remove non-null assertions without guards
9. Fix dependency array issues in hooks
10. Implement proper logging instead of console

### Medium-term Actions (Medium Priority)
11. Implement atomic counters or queues for concurrent operations
12. Optimize bundle size (reduce chunkSizeWarningLimit)
13. Add timeout to fetch operations
14. Use proper storage for sensitive data (IndexedDB)
15. Implement fallback for ML model loading

### Long-term Actions (Low Priority)
16. Refactor localStorage usage with encryption
17. Improve heading hierarchy for accessibility
18. Fix heading navigation to use React Router
19. Add proper types for session state
20. Implement comprehensive error boundaries

---

## SECURITY AUDIT SUMMARY

**Overall Security Grade: C+**

**Strengths:**
- Error boundary implementation
- CORS headers configured
- Rate limiting on edge functions
- Input validation on API endpoints
- Sanitization in logger

**Weaknesses:**
- Hardcoded API keys
- Loose TypeScript configuration
- Missing error handling in critical paths
- localStorage used for sensitive data
- URL parameter auth bypass

**Compliance Notes:**
- App claims to be privacy-first and offline-first ✓
- Camera processing local only ✓
- No forced telemetry ✓
- RLS policies protect data ✓

**Recommendations for Production:**
1. Implement proper secrets management
2. Enable all TypeScript strict checks
3. Add comprehensive error monitoring
4. Implement security headers (CSP, etc.)
5. Regular security audits
6. Penetration testing before deployment

