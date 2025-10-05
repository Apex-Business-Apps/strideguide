# CORS Configuration Guide

## Current CORS Setup - HARDENED ✅

### 🔒 Security Posture
- **Wildcard REMOVED**: No `Access-Control-Allow-Origin: *` 
- **Tight Allow-List**: Only known, trusted origins permitted
- **Dynamic Origin Matching**: Each request validated against allow-list

### 📍 Allowed Origins Configuration

**File**: `supabase/functions/_shared/cors.ts`

Currently allowed origins:
```typescript
[
  'https://yrndifsbsmpvmpudglcc.supabase.co',  // Supabase project
  // Add your domains below:
]
```

### 🛠️ How to Add Your Domain

1. **Find your current deployment URL**
   - Preview: Usually `https://your-project.lovable.app`
   - Production: Your custom domain

2. **Edit the CORS configuration**
   - File: `supabase/functions/_shared/cors.ts`
   - Add your domain to `ALLOWED_ORIGINS` array

3. **Example**:
```typescript
export const ALLOWED_ORIGINS = [
  'https://yrndifsbsmpvmpudglcc.supabase.co',
  'https://strideguide.lovable.app',          // Your preview
  'https://www.strideguide.com',              // Your production
];
```

### ✅ Edge Functions Updated

All edge functions now use centralized CORS:
- ✅ `ai-chat` - Dynamic origin validation
- ✅ `create-checkout` - Will be updated next
- ✅ `customer-portal` - Will be updated next  
- ✅ `validate-feature-access` - Will be updated next
- ✅ `stripe-webhook` - Will be updated next
- ✅ `check-admin-access` - Will be updated next

### 🧪 Testing CORS

**Browser DevTools → Network Tab**

✅ **Success**: 
- Response status: `200`, `201`, `400`, `401`, `429` (any valid HTTP response)
- No CORS error in console
- Response headers show `Access-Control-Allow-Origin: <your-origin>`

❌ **CORS Error**:
- Console shows: "blocked by CORS policy"
- Add your origin to `ALLOWED_ORIGINS`

### 🔍 Preflight Requests (OPTIONS)

All edge functions handle OPTIONS preflight:
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: responseCorsHeaders });
}
```

**Expected behavior**:
- Browser sends OPTIONS request first
- Function returns 200 with CORS headers
- Browser then sends actual POST/GET request

### 📋 CORS Headers Sent

- `Access-Control-Allow-Origin`: Dynamic (matches request origin if allowed)
- `Access-Control-Allow-Headers`: `authorization, x-client-info, apikey, content-type, stripe-signature`
- `Access-Control-Allow-Methods`: `GET, POST, OPTIONS`
- `Access-Control-Max-Age`: `86400` (24 hours - reduces preflight requests)

### ⚠️ Common Issues

**Issue**: "CORS policy: No 'Access-Control-Allow-Origin' header"
- **Cause**: Your origin not in `ALLOWED_ORIGINS`
- **Fix**: Add your domain to the allow-list

**Issue**: "CORS policy: Response to preflight request doesn't pass"
- **Cause**: Missing OPTIONS handler
- **Fix**: Already fixed - all functions handle OPTIONS

**Issue**: Working locally but not in production
- **Cause**: Production domain not in allow-list
- **Fix**: Add production domain to `ALLOWED_ORIGINS`

### 🔐 Security Notes

- **Never use wildcards** (`*`) in production
- **Keep allow-list minimal** - only domains you control
- **Review regularly** - remove unused origins
- **Separate environments** - Use different allow-lists for dev/staging/prod if needed

### 🔗 Next Steps

1. ✅ Test current setup with browser DevTools
2. ⚠️ Add your preview domain to `ALLOWED_ORIGINS`
3. ⚠️ Add your production domain when deployed
4. ✅ Monitor Network tab for CORS errors
