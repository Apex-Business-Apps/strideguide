# Cache Management Guide

## Service Worker Behavior

### Production
- ✅ Service Worker **ENABLED**
- Caches static assets for offline use
- Updates automatically every hour
- Version: Check console for `SW_VERSION`

### Preview/Development
- ❌ Service Worker **DISABLED**
- No caching to ensure fresh content
- Any existing SW automatically unregistered on load
- Hot reload works without cache conflicts

## When to Clear Cache

### Automatic Scenarios (No Action Needed)
- ✅ Preview/dev builds auto-unregister SW
- ✅ SW version mismatch triggers cache clear
- ✅ Corrupted cache auto-detected and cleared

### Manual Clear Required
Clear cache if you experience:
- Stale content after deployment
- Missing new features
- Version stamp doesn't match latest edit
- Unexpected behavior post-update

## How to Clear Cache

### Method 1: Automated Utility (Recommended)
1. Navigate to: `/clear-cache.html`
2. Click "Clear All Cache & Reload"
3. Wait for automatic reload

**What it clears**:
- ✅ All service worker registrations
- ✅ All caches (Cache API)
- ✅ localStorage
- ✅ sessionStorage
- ✅ IndexedDB databases

### Method 2: Manual Browser Steps

#### Chrome/Edge/Brave
```
1. Open DevTools (F12)
2. Application tab → Storage
3. Click "Clear site data"
4. Check all boxes
5. Click "Clear site data"
6. Hard reload: Ctrl+Shift+R (Win) / Cmd+Shift+R (Mac)
```

#### Firefox
```
1. Open DevTools (F12)
2. Storage tab
3. Right-click each item → Delete All
4. Hard reload: Ctrl+Shift+R (Win) / Cmd+Shift+R (Mac)
```

#### Safari
```
1. Develop menu → Empty Caches
2. Hard reload: Cmd+Shift+R
```

### Method 3: Console Command (Quick)
```javascript
// Paste in browser console:
(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) await r.unregister();
  const keys = await caches.keys();
  for (const k of keys) await caches.delete(k);
  localStorage.clear(); sessionStorage.clear();
  location.reload(true);
})();
```

## Verifying Fresh Content

After clearing cache, verify you're seeing the latest version:

### 1. Check Console
```javascript
// Should log current version
console.log('SW Version:', SW_VERSION);
// Should show: sg-2025-10-05-baseline-v4 or newer
```

### 2. Check Network Tab
- Open DevTools → Network
- Look for requests marked "(from cache)" or "(from ServiceWorker)"
- After cache clear, should see fresh requests with 200 status
- No "(from cache)" entries immediately after clear

### 3. Check Application Tab
- DevTools → Application → Cache Storage
- Should be empty or show only the new cache name
- Service Workers section should show version matching console

### 4. Visual Verification
- Check for latest UI changes
- Verify new features are present
- Confirm no old components visible

## Version Stamping

Current version is logged to console on app load:
```
[App] Service Worker DISABLED (dev/preview mode). Current version: sg-2025-10-05-baseline-v4
```

**In production:**
```
[App] Service Worker registered, version: sg-2025-10-05-baseline-v4
```

## Environment Detection

The app automatically detects the environment:

| Environment | SW Enabled | Detection Method |
|-------------|------------|------------------|
| Local Dev   | ❌ No      | `import.meta.env.DEV` |
| Localhost   | ❌ No      | hostname = 'localhost' |
| Preview     | ❌ No      | hostname includes '.lovable.app' |
| Production  | ✅ Yes     | None of the above |

## Troubleshooting

### Issue: "Version still shows old date"
**Solution**: 
1. Go to `/clear-cache.html`
2. Run cache clear
3. Check console after reload

### Issue: "Service Worker won't unregister"
**Solution**:
```javascript
// Force unregister all
navigator.serviceWorker.getRegistrations().then(r => 
  Promise.all(r.map(reg => reg.unregister()))
).then(() => location.reload(true));
```

### Issue: "Cache keeps coming back"
**Cause**: Multiple tabs/windows open
**Solution**: Close all tabs, run clear, open single tab

### Issue: "Changes not appearing in preview"
**Expected**: Preview auto-disables SW
**If still seeing cache**:
1. Hard reload: Ctrl+Shift+R
2. Check "Disable cache" in DevTools Network tab
3. Use `/clear-cache.html`

## Best Practices

### During Development
- ✅ Work in preview (SW auto-disabled)
- ✅ Use DevTools "Disable cache" when Network tab open
- ✅ Hard reload after major changes
- ❌ Don't manually register SW in dev

### Before Testing
- ✅ Clear cache using `/clear-cache.html`
- ✅ Test in incognito/private window
- ✅ Verify version in console matches deployment

### Before Production Deploy
- ✅ Bump SW_VERSION in `src/sw-version.ts`
- ✅ Test cache clear flow
- ✅ Verify SW registration in production
- ✅ Document version in release notes

## Cache Clear Utility Features

The `/clear-cache.html` utility provides:
- ✅ Visual step-by-step progress
- ✅ Detailed report of what was cleared
- ✅ Automatic reload with cache bypass
- ✅ Error handling with fallback
- ✅ Keyboard shortcut: Ctrl/Cmd+R

## Quick Reference

**Clear cache now**: Go to `/clear-cache.html`

**Check version**: Open console, look for SW Version log

**Verify environment**: 
- Console shows "DISABLED" = preview/dev ✅
- Console shows "registered" = production ✅

**Hard reload**: `Ctrl+Shift+R` (Win/Linux) or `Cmd+Shift+R` (Mac)
