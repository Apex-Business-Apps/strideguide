# StrideGuide A11y Audit Checklist
**Date:** 2025-10-06  
**Auditor:** _________________  
**Platform:** iOS / Android / Desktop (circle one)  
**Status:** 🟡 IN PROGRESS

---

## T-C: A11y Audit to Full PASS

### 1️⃣ Control Count (Above the Fold - Mobile)

**Target:** ≤5 primary controls visible above the fold

**Controls Identified:**
- [ ] 1. ___________________________________ (e.g., "Start Guidance")
- [ ] 2. ___________________________________ (e.g., "Find Lost Item")
- [ ] 3. ___________________________________ (e.g., "Language Toggle")
- [ ] 4. ___________________________________ (e.g., "Settings")
- [ ] 5. ___________________________________ (e.g., "Sign In")

**Total Count:** _____ / 5  
**Status:** ⬜ PASS ⬜ FAIL

**Notes:**
```
[Record any additional controls or reasons for pass/fail]
```

---

### 2️⃣ Touch Target Sizes

**Target:** ≥44pt (iOS) / ≥48dp (Android) for all interactive elements

**Measurements:**

| Element | Width | Height | Pass/Fail |
|---------|-------|--------|-----------|
| Start Guidance Button | ___pt/dp | ___pt/dp | ⬜ ⬜ |
| Find Lost Item Button | ___pt/dp | ___pt/dp | ⬜ ⬜ |
| Language Toggle | ___pt/dp | ___pt/dp | ⬜ ⬜ |
| Settings Icon | ___pt/dp | ___pt/dp | ⬜ ⬜ |
| SOS Button | ___pt/dp | ___pt/dp | ⬜ ⬜ |
| Install Chip Buttons | ___pt/dp | ___pt/dp | ⬜ ⬜ |
| iOS Helper Dismiss | ___pt/dp | ___pt/dp | ⬜ ⬜ |

**Status:** ⬜ PASS ⬜ FAIL

**Notes:**
```
[Tool used: browser DevTools / physical measurement]
```

---

### 3️⃣ Color Contrast (WCAG 2.2 Level AA)

**Target:** ≥4.5:1 for normal text, ≥3:1 for large text (18pt+)

**Measurements:**

| Element | Foreground | Background | Contrast | Pass/Fail |
|---------|-----------|------------|----------|-----------|
| Primary Button Text | ______ | ______ | ___:1 | ⬜ ⬜ |
| Body Text | ______ | ______ | ___:1 | ⬜ ⬜ |
| Secondary Text | ______ | ______ | ___:1 | ⬜ ⬜ |
| Link Text | ______ | ______ | ___:1 | ⬜ ⬜ |
| Install Chip Text | ______ | ______ | ___:1 | ⬜ ⬜ |
| Error Messages | ______ | ______ | ___:1 | ⬜ ⬜ |

**Status:** ⬜ PASS ⬜ FAIL

**Tools Used:**
- [ ] WebAIM Contrast Checker
- [ ] Chrome DevTools Accessibility Panel
- [ ] axe DevTools
- [ ] Other: ___________________

**Notes:**
```
[Record any contrast issues or design tokens used]
```

---

### 4️⃣ VoiceOver Testing (iOS)

**Test Device:** iPhone ______________ (model)  
**iOS Version:** ______________  
**VoiceOver Version:** ______________

**Test Scenarios:**

#### Scenario 1: Home Screen Navigation
- [ ] VoiceOver announces app name on launch
- [ ] Focus order is logical (top-to-bottom, left-to-right)
- [ ] All buttons have descriptive labels
- [ ] Rotor can access all headings
- [ ] Gestures work: swipe right/left, double-tap

**Focus Order (recorded):**
```
1. _________________________________
2. _________________________________
3. _________________________________
4. _________________________________
5. _________________________________
```

**Status:** ⬜ PASS ⬜ FAIL

#### Scenario 2: Guidance Workbench
- [ ] Camera status announced
- [ ] Start/Stop button clearly labeled
- [ ] Audio feedback works with VoiceOver
- [ ] Alerts announced via live region
- [ ] Exit navigation is clear

**Status:** ⬜ PASS ⬜ FAIL

#### Scenario 3: Install Prompts
- [ ] Install Chip announced as alert
- [ ] Dismiss button clearly labeled
- [ ] iOS Install Sheet announces correctly
- [ ] Sheet can be dismissed with VoiceOver

**Status:** ⬜ PASS ⬜ FAIL

**Issues Found:**
```
[List any VoiceOver issues with severity: Critical / High / Medium / Low]
1. 
2. 
3. 
```

**Screen Recording:** ⬜ Attached (15-sec demo of focus order)

---

### 5️⃣ TalkBack Testing (Android)

**Test Device:** Android ______________ (model)  
**Android Version:** ______________  
**TalkBack Version:** ______________

**Test Scenarios:**

#### Scenario 1: Home Screen Navigation
- [ ] TalkBack announces app name on launch
- [ ] Focus order is logical
- [ ] All buttons have descriptive labels
- [ ] Headings navigation works
- [ ] Gestures work: swipe right/left, double-tap

**Focus Order (recorded):**
```
1. _________________________________
2. _________________________________
3. _________________________________
4. _________________________________
5. _________________________________
```

**Status:** ⬜ PASS ⬜ FAIL

#### Scenario 2: Guidance Workbench
- [ ] Camera status announced
- [ ] Start/Stop button clearly labeled
- [ ] Audio feedback works with TalkBack
- [ ] Alerts announced via live region
- [ ] Exit navigation is clear

**Status:** ⬜ PASS ⬜ FAIL

#### Scenario 3: Install Prompts
- [ ] Install Chip announced as alert
- [ ] Dismiss button clearly labeled
- [ ] Action labels are descriptive

**Status:** ⬜ PASS ⬜ FAIL

**Issues Found:**
```
[List any TalkBack issues with severity: Critical / High / Medium / Low]
1. 
2. 
3. 
```

**Screen Recording:** ⬜ Attached (15-sec demo of focus order)

---

## 📊 Overall A11y Audit Results

| Category | Status | Notes |
|----------|--------|-------|
| Control Count | ⬜ PASS ⬜ FAIL | _____ / 5 controls |
| Touch Targets | ⬜ PASS ⬜ FAIL | All ≥44pt/48dp |
| Color Contrast | ⬜ PASS ⬜ FAIL | All ≥4.5:1 or 3:1 |
| VoiceOver (iOS) | ⬜ PASS ⬜ FAIL | Focus order + labels |
| TalkBack (Android) | ⬜ PASS ⬜ FAIL | Focus order + labels |

**Final Verdict:** ⬜ FULL PASS ⬜ CONDITIONAL PASS ⬜ FAIL

**Acceptance Criteria Met:**
- [ ] ≤5 primary controls above fold
- [ ] ≥44pt/48dp touch targets
- [ ] WCAG 2.2 AA contrast compliance
- [ ] VoiceOver + TalkBack functional
- [ ] Screen recordings attached (2x 15-sec)

---

## 🚨 Critical Issues (Must Fix Before Pilot)

**Priority 1 (Blocking):**
```
1. 
2. 
3. 
```

**Priority 2 (High):**
```
1. 
2. 
3. 
```

**Priority 3 (Medium):**
```
1. 
2. 
3. 
```

---

## 📝 Auditor Sign-Off

**Name:** _________________________________  
**Date:** _________________________________  
**Signature:** _________________________________

**Evidence Pack Location:**
- Screen Recordings: `/artifacts/T-C/[date]/`
- Screenshots: `/artifacts/T-C/[date]/`
- Contrast Reports: `/artifacts/T-C/[date]/`

---

## 🔗 References

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Apple VoiceOver Guide](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios)
- [Android TalkBack Guide](https://support.google.com/accessibility/android/answer/6283677)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**End of Checklist**
