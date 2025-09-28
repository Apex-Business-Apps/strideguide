# StrideGuide - Project Operating Guide

## Mission Statement
Build the world's most trusted offline-first seeing-eye assistant for seniors and blind users, starting in Canada (EN/FR) and expanding globally.

## Core Principles

### Offline-First Architecture
- **Safety-critical flows**: Must work without internet connectivity
- **Privacy by design**: No camera frames leave device under any circumstances
- **Local processing**: All vision inference happens on-device via TensorFlow Lite/Core ML
- **Emergency resilience**: SOS and fall detection function in airplane mode (cellular-only)

### Accessibility Standards (WCAG 2.2 AA+)
- **Touch targets**: Minimum 52dp/pt (exceeds WCAG requirement)
- **Screen readers**: 100% VoiceOver/TalkBack compatibility with proper ARIA labeling
- **Color contrast**: Minimum AA, targeting AAA for text elements
- **Haptic feedback**: Confirmation taps, strong patterns for "Stop!" alerts, SOS countdown
- **Focus management**: Logical tab order, visible focus indicators
- **Motor accessibility**: Supports switch control and voice commands

## Product Tiers & Gating

### Free Tier Constraints
- **Daily limit**: 2 hours active guidance time (countdown during camera processing only)
- **Night mode**: Locked with TTS announcement explaining Premium requirement
- **Usage reset**: Daily at midnight local time
- **Limit behavior**: Guidance pauses, bilingual TTS notice + upgrade CTA

### Premium Tier ($28.99/month)
- **Daily limit**: 8 hours active guidance time
- **Night mode**: Full low-light enhancement pipeline enabled
- **Strap incentive**: Free neck strap with breakaway safety clasp
- **Priority support**: Enhanced customer service

### Feature Flags
```
LOW_END_MODE: boolean (reduces FPS/resolution for older devices)
WINTER_MODE: boolean (enhanced ice/slip detection)
NIGHT_MODE_ENABLED: boolean (Premium only, locked for free users)
CLOUD_DESCRIBE_ENABLED: boolean (future feature, currently disabled)
```

## Technical Specifications

### Vision Processing Pipeline
- **Model**: YOLO-nano v1.2 (hazards.tflite / hazards.mlmodelc)
- **Input resolution**: ≤800px for optimal performance
- **Target FPS**: ≥10 FPS on target devices (Pixel 6, iPhone 12)
- **Hazard classes**: pothole, curb_up/down, step, ice_slick, cone, pole, bike, dog, vehicle, wall, dropoff
- **Output format**: class, position (left/center/right), distance bin (near/mid/far)

### Lost Item Finder Pipeline (NEW)
- **Teaching**: 3-4 video clips or 12 photos per item with on-device embedding generation
- **Detection**: MobileNet-SSD object detection → ROI extraction → embedding comparison
- **Matching**: Cosine similarity with learned embeddings (threshold ≥0.7)
- **Performance**: 5-10 FPS processing, ≤180ms per frame
- **Storage**: Encrypted local storage for learned items (device keychain/keystore)
- **Guidance**: Stereo audio panning + haptic distance feedback (hot/cold patterns)

### Audio Guidance System
- **TTS engines**: AVSpeechSynthesizer (iOS), Android TextToSpeech
- **Languages**: EN/FR with offline voice downloads required
- **Stereo panning**: Left/right channel guidance for directional cues
- **Audio ducking**: Reduces background audio during guidance
- **Volume controls**: Hardware volume buttons repeat last cue

### Fall Detection & Emergency
- **Sensors**: Accelerometer + gyroscope fusion via Core Motion/SensorManager
- **Algorithm**: Posture analysis + impact detection with machine learning filtering
- **Confirmation**: 30-second countdown with large cancel button
- **Emergency protocol**: SMS with GPS coordinates → voice call to primary ICE contact
- **Consent**: Explicit user setup required for emergency contacts

### Night Mode (Premium Feature)
- **iOS**: AVFoundation low-light boost when available
- **Android**: CameraX night mode extensions
- **Fallback**: Software-based image enhancement for devices without hardware support
- **Performance**: Must not regress daytime processing targets
- **Gating**: Feature flag check + subscription validation

## Internationalization (i18n)

### Language Support
- **Primary**: English (Canada), French (Canada)
- **Future**: English (US), French (France), Spanish (US)
- **String externalization**: All user-facing text in JSON locale files
- **TTS parity**: Equal voice quality and pronunciation accuracy
- **Cultural adaptation**: Emergency contact formats, metric units, currency

### Localization Requirements
- Date/time formats per locale
- Emergency phone number formats (xxx-xxx-xxxx vs +1-xxx-xxx-xxxx)
- Metric measurements throughout (meters, celsius, kilometers)
- Currency display for subscription pricing
- Right-to-left text support preparation (future Arabic/Hebrew)

## Quality Gates & Testing

### Performance Benchmarks
- **Vision inference**: ≤120ms per frame on target devices
- **Battery life**: ≥2.5 hours continuous guidance (50% brightness, BT headphones)
- **Memory usage**: <150MB including models and framework overhead
- **Thermal management**: Graceful degradation to 5 FPS under thermal stress

### Accessibility Testing
- **Automated**: axe-core accessibility snapshots in CI/CD
- **Manual**: Screen reader sweep testing on each major release
- **Touch targets**: Measured verification ≥52dp/pt across all interactive elements
- **Color contrast**: Automated WCAG AA/AAA verification
- **Keyboard navigation**: Tab order validation and focus management

### Safety & Compliance Testing
- **Fall detection accuracy**: <5% false positive rate on validation dataset
- **Emergency reliability**: 100% SMS delivery in cellular-only scenarios
- **Privacy verification**: Network traffic monitoring to ensure no camera frames transmitted
- **Localization**: Bilingual user acceptance testing for all critical flows

### Device Compatibility Matrix
- **Primary**: iPhone 12+ (iOS 15+), Pixel 6+ (Android 12+)
- **Secondary**: iPhone SE 3rd gen, Galaxy A54, Pixel 7a
- **Performance scaling**: LOW_END_MODE for devices with <6GB RAM
- **Accessibility**: Testing across VoiceOver, TalkBack, Switch Control

## Development Workflow

### CI/CD Pipeline
- **Linting**: ESLint, Prettier, SwiftLint, Kotlin linter
- **Testing**: Unit tests (>80% coverage), integration tests, accessibility snapshots
- **Performance**: Automated FPS benchmarking on device farm
- **Security**: Static analysis, dependency vulnerability scanning
- **Localization**: String extraction validation, translation completeness check

### Model Lifecycle
- **Versioning**: Semantic versioning for ML models (v1.2.3)
- **Registry**: Model artifacts stored with metadata (accuracy, size, performance)
- **A/B Testing**: Gradual rollout with performance monitoring
- **Rollback**: Automatic fallback to previous model on performance regression

### Release Strategy
- **Trunk-based**: Short-lived feature branches, frequent integration
- **Feature flags**: Gradual rollout of new capabilities
- **Emergency patches**: Hot-fix process for critical safety issues
- **Accessibility**: Mandatory a11y review before any UI changes

## Strap Incentive Program

### Product Specifications
- **Material**: Neoprene or polyester, skin-safe certified
- **Safety**: Breakaway clasp rated 15 lbs ±3 lbs force
- **Compatibility**: Universal phone attachment, works with cases
- **Dimensions**: Adjustable 28-52 inches, 3/4" width
- **Branding**: Subtle StrideGuide logo on clasp tab

### Fulfillment Requirements
- **MOQ**: Minimum 500 units for cost efficiency
- **Lead time**: 2-3 weeks bulk production
- **Quality control**: Safety testing for breakaway force compliance
- **Packaging**: Individual bags with safety instructions
- **Shipping**: Integration with subscription signup flow

## Acceptance Criteria (MVP v1)

### Core Functionality
- [ ] Vision processing achieves ≥10 FPS @800px on Pixel 6 & iPhone 12
- [ ] Fall detection → 30s countdown → SMS with GPS → emergency call sequence
- [ ] Stereo audio guidance with proper left/right channel panning
- [ ] EN/FR language toggle with TTS voice switching
- [ ] Offline operation for all safety-critical features

### Pricing & Gating
- [ ] Free users hit 2h limit → guidance pauses → bilingual upgrade prompt
- [ ] Premium users access night mode + 8h daily limit
- [ ] Night mode properly locked for free tier with accessible error messages
- [ ] Usage metering resets daily at midnight local time

### Accessibility Compliance
- [ ] All touch targets measure ≥52dp/pt via automated testing
- [ ] VoiceOver/TalkBack announce control names, roles, states, and hints
- [ ] Haptic patterns fire on tap confirmations and emergency countdown
- [ ] Color contrast meets WCAG AA minimum across light/dark themes
- [ ] Focus order logical and efficient for keyboard/switch navigation

### Safety & Privacy
- [ ] Emergency SMS includes only GPS coordinates + preset message
- [ ] No camera frames transmitted verified via network monitoring
- [ ] Fall detection false positive rate <5% on validation dataset
- [ ] Telemetry collection opt-in with clear data usage explanation

This guide serves as the single source of truth for StrideGuide development priorities, technical decisions, and quality standards.