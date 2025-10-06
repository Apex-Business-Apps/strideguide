# T-A & T-B Implementation Guide
**Date:** 2025-10-06  
**Status:** ✅ COMPLETE

---

## Overview

This document describes the implementation of:
- **T-A:** Surface PWA Install UI (Install Prompt Chip)
- **T-B:** Elevate iOS A2HS Helper (iOS Install Sheet)

Both components are now integrated and ready for testing.

---

## T-A: Install Prompt Chip

### Purpose
High-visibility install prompt for Android/Desktop users when PWA is installable.

### Location
`src/components/install/InstallPromptChip.tsx`

### Features
- ✅ Listens for `beforeinstallprompt` event via `InstallManager`
- ✅ Shows compact chip above "Start Guidance" button
- ✅ One-shot behavior: dismissed state persisted in `localStorage`
- ✅ Bilingual support (EN/FR)
- ✅ Runtime flag: `ui.enablePWAInstallChip` (default: `true`)

### Integration
Integrated in `src/pages/Index.tsx` at line ~606:
```tsx
{/* T-A: Install Prompt Chip - positioned above main actions */}
<div className="flex justify-center">
  <InstallPromptChip />
</div>
```

### Runtime Flag Control

**Enable (default):**
```javascript
// In browser console or settings
localStorage.setItem('ui.enablePWAInstallChip', 'true');
```

**Disable:**
```javascript
localStorage.removeItem('ui.enablePWAInstallChip');
// or
localStorage.setItem('ui.enablePWAInstallChip', 'false');
```

**Reset dismissed state (for testing):**
```javascript
localStorage.removeItem('strideguide_install_chip_dismissed');
window.location.reload();
```

### Acceptance Evidence Requirements

1. **Video (Android):**
   - Open app in Chrome/Edge on Android
   - Show chip appearing above "Start Guidance"
   - Tap "Install" → show install dialog
   - Confirm install → chip disappears
   - Reopen app → chip does NOT reappear

2. **Video (Desktop):**
   - Open app in Chrome/Edge on Desktop
   - Show chip appearing
   - Click "Dismiss" (X button)
   - Chip disappears
   - Reload page → chip does NOT reappear

3. **Screenshot:**
   - Chip positioned above hero CTA
   - Bilingual: EN and FR screenshots

4. **Runtime Flag:**
   - Document flag key: `ui.enablePWAInstallChip=true`

---

## T-B: iOS Install Sheet

### Purpose
Bottom sheet with step-by-step installation instructions for iOS Safari users.

### Location
`src/components/install/IOSInstallSheet.tsx`

### Features
- ✅ Detects Safari on iOS only
- ✅ Shows bottom sheet with 2–3 step instructions
- ✅ Inline "Got it" to dismiss
- ✅ Never shows in standalone (installed) context
- ✅ Bilingual support (EN/FR) via `InstallManager.getInstallInstructions()`
- ✅ Runtime flag: `ui.enableIOSA2HSHelper` (default: `true`)

### Integration
Integrated in `src/pages/Index.tsx` at line ~817:
```tsx
{/* T-B: iOS Install Sheet - bottom sheet for iOS users */}
<IOSInstallSheet />
```

### Runtime Flag Control

**Enable (default):**
```javascript
localStorage.setItem('ui.enableIOSA2HSHelper', 'true');
```

**Disable:**
```javascript
localStorage.removeItem('ui.enableIOSA2HSHelper');
// or
localStorage.setItem('ui.enableIOSA2HSHelper', 'false');
```

**Reset dismissed state (for testing):**
```javascript
localStorage.removeItem('strideguide_ios_helper_dismissed');
window.location.reload();
```

### Acceptance Evidence Requirements

1. **Screen Recording (iPhone):**
   - Open app in Safari on iPhone
   - Show bottom sheet appearing after 1 second
   - Tap to expand → show full instructions
   - Show Share icon visual cue
   - Tap "Got it" → sheet dismisses
   - Reload page → sheet does NOT reappear

2. **Screenshot:**
   - Collapsed state (preview)
   - Expanded state with instructions (EN)
   - Expanded state with instructions (FR)

3. **Standalone Test:**
   - Add app to Home Screen
   - Launch from Home Screen
   - Confirm sheet does NOT appear

4. **Runtime Flag:**
   - Document flag key: `ui.enableIOSA2HSHelper=true`

---

## Testing Checklist

### T-A: Install Prompt Chip

- [ ] Appears on Android Chrome when installable
- [ ] Appears on Desktop Chrome/Edge when installable
- [ ] Does NOT appear on iOS
- [ ] Does NOT appear when already installed
- [ ] Dismiss button works (chip disappears)
- [ ] Install button triggers native prompt
- [ ] Dismissed state persists across reloads
- [ ] Install completion hides chip permanently
- [ ] EN/FR translations work correctly
- [ ] Runtime flag can disable feature

### T-B: iOS Install Sheet

- [ ] Appears on iOS Safari when not installed
- [ ] Auto-expands after 1 second
- [ ] Shows correct instructions in EN
- [ ] Shows correct instructions in FR
- [ ] Share icon visual cue is clear
- [ ] "Got it" button dismisses sheet
- [ ] Dismissed state persists across reloads
- [ ] Does NOT appear in standalone mode
- [ ] Does NOT appear on Android
- [ ] Does NOT appear on Desktop
- [ ] Runtime flag can disable feature

---

## Known Limitations

### T-A (Install Chip)
- **No native prompt on iOS:** iOS does not support `beforeinstallprompt`, so chip won't show
- **Browser support:** Only Chromium-based browsers (Chrome, Edge, Brave, etc.)

### T-B (iOS Sheet)
- **Manual installation only:** iOS requires users to manually tap Share → Add to Home Screen
- **Safari only:** iOS Chrome/Firefox use Safari engine but may not show as installable
- **No programmatic trigger:** Cannot force installation dialog on iOS

---

## Debugging

### Check Install State
```javascript
// In browser console
InstallManager.getDebugInfo()
// Returns: { userAgent, standalone, displayMode, hasDeferredPrompt, currentState, etc. }
```

### Check Platform Detection
```javascript
InstallManager.getState()
// Returns: { canInstall, isInstalled, platform, installType }
```

### Force Show Components (for testing)
```javascript
// Reset all dismissed states
localStorage.removeItem('strideguide_install_chip_dismissed');
localStorage.removeItem('strideguide_ios_helper_dismissed');
window.location.reload();
```

---

## Evidence Artifact Paths

```
/artifacts/T-A/2025-10-06/
  - android-chip-install.mp4      (Video: Android install flow)
  - desktop-chip-dismiss.mp4      (Video: Desktop dismiss flow)
  - chip-hero-en.png              (Screenshot: EN version)
  - chip-hero-fr.png              (Screenshot: FR version)

/artifacts/T-B/2025-10-06/
  - ios-sheet-expand.mp4          (Video: iOS sheet expand + dismiss)
  - ios-sheet-collapsed-en.png    (Screenshot: collapsed state EN)
  - ios-sheet-expanded-en.png     (Screenshot: expanded state EN)
  - ios-sheet-expanded-fr.png     (Screenshot: expanded state FR)
  - ios-standalone-test.mp4       (Video: confirms no sheet in standalone)
```

---

## Implementation Status

| Task | Status | Evidence Required |
|------|--------|-------------------|
| T-A: Install Chip Component | ✅ DONE | Video + Screenshots |
| T-A: Integration in Index | ✅ DONE | - |
| T-A: EN/FR Translations | ✅ DONE | - |
| T-A: Runtime Flag | ✅ DONE | Flag key documented |
| T-B: iOS Sheet Component | ✅ DONE | Video + Screenshots |
| T-B: Integration in Index | ✅ DONE | - |
| T-B: EN/FR Translations | ✅ DONE | - |
| T-B: Runtime Flag | ✅ DONE | Flag key documented |
| **User Testing** | 🟡 PENDING | Awaiting device tests |

---

## Next Steps

1. **Deploy to staging/preview** for device testing
2. **Capture evidence videos** on real devices:
   - Android phone (Pixel, Samsung, etc.)
   - iPhone (Safari)
   - Desktop Chrome/Edge
3. **Document evidence** in `/artifacts/` directory
4. **Update audit report** with test results
5. **Sign off** on T-A and T-B as PASS

---

**Owner:** Implementation Team  
**Reviewer:** QA Lead  
**Sign-off Required:** YES (with evidence pack)

---

**End of Guide**
