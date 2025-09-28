# StrideGuide Security Threat Model

**Version:** 2.0  
**Last Updated:** January 2025

## Executive Summary

This document outlines the security threats faced by StrideGuide and the mitigations implemented to protect users. As an accessibility-focused PWA handling sensitive camera data and emergency information, security is paramount to user safety and privacy.

## Asset Inventory

### Critical Assets
1. **User Camera Feed** - Real-time video processed for guidance
2. **Emergency Contact Information** - ICE contacts and phone numbers  
3. **Learned Item Patterns** - ML embeddings for lost item detection
4. **Location Data** - GPS coordinates during emergency SOS
5. **Application Code** - Core functionality and ML models

### Sensitive Data Flows
1. Camera → Local ML Processing → Audio/Haptic Feedback
2. User Input → Encrypted Storage → Emergency SMS
3. Device Sensors → Local Processing → Navigation Guidance

## Threat Analysis

| Threat ID | Threat Vector | Asset Impact | Likelihood | Impact | Risk Level |
|-----------|---------------|--------------|------------|---------|------------|
| T001 | XSS/Script Injection | App Code | Medium | High | High |
| T002 | Service Worker Cache Poisoning | App Code | Low | High | Medium |
| T003 | IndexedDB Data Theft | Personal Data | Medium | High | High |
| T004 | Prompt Injection (LLM) | AI Processing | Medium | Medium | Medium |
| T005 | Lost Item Label Abuse | Content Safety | High | Low | Medium |
| T006 | SOS Spam/Accidental Triggers | Emergency System | High | Medium | High |
| T007 | Audio Context Blocked | Core Functionality | High | Medium | Medium |
| T008 | Battery Drain Attack | Device Resources | Medium | Medium | Medium |
| T009 | Supabase Data Exposure | Optional Data | Low | High | Medium |
| T010 | Camera Permission Abuse | Privacy | Low | High | Medium |

## Detailed Threat Analysis & Mitigations

### T001: Cross-Site Scripting (XSS)
**Vector:** Malicious scripts injected through user input or compromised dependencies
**Assets:** Application code, user session, sensitive functions
**Mitigations:**
- ✅ Strict Content Security Policy (no inline scripts, eval disabled)
- ✅ Input validation and sanitization via zod schemas
- ✅ No innerHTML with user content
- ✅ Subresource Integrity (SRI) for third-party assets

### T002: Service Worker Cache Poisoning  
**Vector:** Malicious responses cached and served to users
**Assets:** Application integrity, user trust
**Mitigations:**
- ✅ Allowlist-based caching (deny-by-default)
- ✅ Same-origin enforcement for cached content
- ✅ Cache versioning with atomic activation
- ✅ Corrupted cache detection and purging

### T003: Local Data Theft
**Vector:** Device access, malware, or browser vulnerabilities exposing IndexedDB
**Assets:** Emergency contacts, learned item patterns
**Mitigations:**
- ✅ AES-GCM 256 encryption for all stored data
- ✅ Device-bound encryption keys using hardware fingerprinting
- ✅ Secure key derivation (PBKDF2 100k+ iterations)
- ✅ "Delete All" functionality for complete data removal

### T004: LLM Prompt Injection
**Vector:** Malicious prompts attempting to extract secrets or bypass safety
**Assets:** AI processing integrity, system information
**Mitigations:**
- ✅ System rule enforcement with conflict resolution
- ✅ Input sanitization and pattern filtering
- ✅ Task allowlisting (only approved operations)
- ✅ Response size and timeout limits
- ✅ PII redaction and content filtering

### T005: Inappropriate Lost Item Labels
**Vector:** Users training the system with illegal/harmful item names
**Assets:** Content safety, regulatory compliance
**Mitigations:**
- ✅ Blocklist validation for illegal items
- ✅ TTS refusal for prohibited content
- ✅ Rate limiting on label creation
- ✅ User education and clear policies

### T006: Emergency SOS Abuse
**Vector:** Accidental triggers, spam, or malicious activation
**Assets:** Emergency response system integrity, user trust
**Mitigations:**
- ✅ 1.2-second hold requirement with progress indicator
- ✅ 15-second cooldown between triggers
- ✅ 3-second cancellation window with voice recognition
- ✅ Haptic and audio feedback during activation

### T007: Audio Context Blocking
**Vector:** Browser autoplay policies preventing audio feedback
**Assets:** Accessibility, core user experience
**Mitigations:**
- ✅ AudioArmer with context health monitoring
- ✅ User gesture detection and prompting
- ✅ Watchdog for suspended contexts
- ✅ Clear visual prompts when audio blocked

### T008: Resource Exhaustion
**Vector:** Excessive processing causing battery drain or performance issues
**Assets:** Device resources, user experience
**Mitigations:**
- ✅ Battery level monitoring with low-power mode
- ✅ FPS throttling when battery < 15%
- ✅ Wake lock management with automatic release
- ✅ ML processing optimizations

### T009: Supabase Data Exposure
**Vector:** Misconfigured RLS policies or excessive data collection
**Assets:** Optional user data, feedback information
**Mitigations:**
- ✅ Default-deny RLS policies on all tables
- ✅ Minimal data collection (no PII in feedback)
- ✅ Anon key only (no service role exposure)
- ✅ Input validation and rate limiting

### T010: Camera Permission Misuse
**Vector:** Unauthorized access to camera beyond stated purpose
**Assets:** User privacy, camera footage
**Mitigations:**
- ✅ Local-only processing (no uploads)
- ✅ Real-time processing with immediate disposal
- ✅ Clear permission prompts and usage indication
- ✅ No storage of camera frames

## Security Controls Matrix

| Control Category | Implementation | Coverage |
|------------------|----------------|----------|
| **Input Validation** | zod schemas, sanitization, type checking | T001, T004, T005 |
| **Content Security** | Strict CSP, SRI, allowlist caching | T001, T002 |
| **Data Protection** | AES-GCM encryption, device binding | T003, T010 |
| **Access Control** | RLS policies, permission management | T009, T010 |
| **Rate Limiting** | Cooldowns, attempt tracking, quotas | T005, T006, T009 |
| **Resource Management** | Battery monitoring, performance throttling | T007, T008 |
| **Incident Response** | Error handling, graceful degradation | All threats |

## Security Testing

### Automated Tests
- CSP violation detection
- Encryption/decryption validation  
- Input sanitization effectiveness
- Rate limiting enforcement
- Service worker cache integrity

### Manual Testing
- Prompt injection resistance
- Emergency system reliability
- Battery management accuracy
- Audio context recovery
- Data deletion completeness

## Incident Response

### Detection
- Browser security violation reports
- Service worker error monitoring
- Failed decryption attempts
- Unusual rate limiting triggers
- Emergency system anomalies

### Response Process
1. **Immediate:** Isolate affected components
2. **Assessment:** Determine impact scope and severity
3. **Containment:** Deploy hotfixes or disable features
4. **Recovery:** Restore normal operation
5. **Learning:** Update controls and documentation

### Communication
- Critical issues: Immediate user notification via app
- Security updates: In-app announcements
- Privacy incidents: Email notification within 72 hours
- Public disclosure: Coordinated release after fixes

## Compliance & Audit

### Privacy Regulations
- **PIPEDA (Canada):** Consent, purpose limitation, breach notification
- **GDPR (EU):** Data subject rights, privacy by design
- **CCPA (California):** Consumer privacy rights and transparency

### Security Standards
- **OWASP Top 10:** Web application security best practices
- **CSA Security Guidance:** Cloud security controls
- **ISO 27001:** Information security management

### Regular Audits
- Quarterly dependency vulnerability scans
- Annual penetration testing
- Continuous security monitoring
- Privacy impact assessments for new features

## Contact & Reporting

**Security Issues:**  
security@strideguide.app  
PGP Key: [Key fingerprint available on security page]

**Privacy Concerns:**  
privacy@strideguide.app

**Emergency Response:**  
Escalation procedures documented in incident response playbook

---

*This threat model is reviewed quarterly and updated with new threats and mitigations. Last review: January 2025*