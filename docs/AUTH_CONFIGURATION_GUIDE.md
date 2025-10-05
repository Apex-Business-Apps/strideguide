# Authentication Configuration Guide

## Current Configuration Analysis

### ✅ Supabase Client Setup
**File**: `src/integrations/supabase/client.ts`
- **Project URL**: `https://yrndifsbsmpvmpudglcc.supabase.co`
- **Anon Key**: Correctly configured (public key, safe to expose)
- **Auth Storage**: localStorage (persistent sessions)
- **Auto Refresh**: Enabled
- **Status**: ✅ CORRECT

### ⚠️ Required Supabase Dashboard Configuration

You must manually configure these settings in your Supabase Dashboard:

#### 1. Site URL Configuration
**Location**: Supabase Dashboard → Authentication → URL Configuration

Set **Site URL** to your current deployment origin:
- **For production**: `https://your-custom-domain.com`
- **For preview**: `https://your-project.lovable.app`
- **For local dev**: `http://localhost:8080`

#### 2. Redirect URLs Configuration
**Location**: Supabase Dashboard → Authentication → URL Configuration

Add ALL of these to **Redirect URLs**:
```
https://your-project.lovable.app/*
https://your-project.lovable.app/auth
https://your-custom-domain.com/* (if you have a custom domain)
http://localhost:8080/* (for local development)
```

#### 3. Email Confirmation Settings (Optional for Testing)
**Location**: Supabase Dashboard → Authentication → Providers → Email

For faster testing during development:
- ✅ Disable "Confirm email" requirement
- ⚠️ Re-enable for production!

### 🔍 Diagnosing "Failed to fetch" Errors

Common causes:
1. **Site URL mismatch**: Site URL doesn't match where you're accessing the app
2. **Missing Redirect URL**: Your current origin isn't in the allowed redirect list
3. **CORS misconfiguration**: See CORS Configuration Guide

### 📋 Authentication Flow Checklist

- ✅ Client uses correct project URL and anon key
- ✅ `emailRedirectTo` is set in signup flow to `${window.location.origin}/`
- ✅ Auth state listener properly configured with `onAuthStateChange`
- ✅ Session and user state both tracked (not just user)
- ⚠️ **YOU MUST SET**: Site URL in Supabase Dashboard
- ⚠️ **YOU MUST SET**: Redirect URLs in Supabase Dashboard

### 🔗 Quick Links
- [Supabase Authentication Settings](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/url-configuration)
- [Supabase Email Provider Settings](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/providers)
