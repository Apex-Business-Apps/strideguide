# Authentication "Failed to Fetch" Troubleshooting Guide

## Problem: "Failed to fetch" error when signing in

This error typically occurs due to one of these issues:

### 1. Supabase URL Configuration Not Set (MOST COMMON)

**Solution:** You MUST configure the Site URL and Redirect URLs in your Supabase Dashboard:

1. Go to [Supabase Authentication Settings](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/url-configuration)

2. Set **Site URL** to:
   - For Lovable preview: `https://your-project.lovable.app`
   - For production: `https://your-custom-domain.com`
   - For local dev: `http://localhost:8080`

3. Add **ALL** of these to **Redirect URLs**:
   ```
   https://*.lovable.app/*
   https://your-project.lovable.app/*
   https://your-custom-domain.com/* (if applicable)
   http://localhost:8080/* (for local dev)
   ```

4. Click **Save**

### 2. Email Confirmation Required (Testing Issue)

If you're testing and don't want to check email every time:

1. Go to [Email Provider Settings](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc/auth/providers)
2. Scroll to **Email** provider
3. **Disable** "Confirm email" requirement
4. ⚠️ **IMPORTANT:** Re-enable this for production!

### 3. CORS Configuration

Check your `supabase/config.toml` has proper CORS settings:

```toml
[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[auth]
enabled = true
site_url = "http://localhost:8080"
additional_redirect_urls = ["https://*.lovable.app"]
jwt_expiry = 3600
enable_signup = true
```

### 4. Network Connectivity

- Check your internet connection
- Try disabling browser extensions (especially ad blockers)
- Try in incognito/private mode
- Check browser console for detailed error messages

### 5. Supabase Project Status

Verify your Supabase project is active:
- Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yrndifsbsmpvmpudglcc)
- Check project status is "Active"
- Check for any service outages

## Testing Checklist

After configuration:

- [ ] Site URL is set in Supabase Dashboard
- [ ] Redirect URLs include your current domain
- [ ] Email confirmation is disabled (for testing)
- [ ] Browser console shows no CORS errors
- [ ] You can access `https://yrndifsbsmpvmpudglcc.supabase.co` in browser
- [ ] Clear browser cache and try again

## Still Having Issues?

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try signing in
4. Look for failed requests to `supabase.co`
5. Check the error details in the request

Common error patterns:
- `ERR_NAME_NOT_RESOLVED` → DNS issue, check Supabase project URL
- `CORS policy` → Add your domain to Redirect URLs
- `403 Forbidden` → Check Site URL configuration
- `401 Unauthorized` → Check credentials or email confirmation

## Quick Fix Commands

If you need to test auth immediately without email confirmation:

```sql
-- Run this in Supabase SQL Editor to bypass email confirmation for a user
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'your@email.com';
```

## Contact Support

If none of these solutions work:
1. Check [Supabase Status](https://status.supabase.com/)
2. Review [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
3. Check the Lovable troubleshooting guide
