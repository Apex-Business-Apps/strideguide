# StrideGuide - Seeing-Eye Assistant for Seniors & Blind Users

**Offline-first guidance system built for Canada (EN/FR), expanding to US/EU**

An accessibility-first mobile assistant providing real-time obstacle detection, stereo audio guidance, fall detection, and emergency SOS capabilities. Built with privacy and safety as core principles.

## Pricing Tiers

### Free Tier
- **Daily Limit**: 2 hours active guidance time
- **Features**: Basic obstacle detection, stereo audio cues, fall detection, SOS
- **Restrictions**: No night mode access

### Premium Tier ($28.99/month)
- **Daily Limit**: 8 hours active guidance time  
- **Features**: All free features + night mode + enhanced low-light detection
- **Bonus**: Free neck strap with breakaway safety clasp included

## Core Features

### Vision & Guidance
- On-device YOLO-nano inference (≤800px @10+ FPS)
- Real-time hazard detection: potholes, curbs, steps, ice, obstacles
- Stereo-panned TTS guidance ("Veer left", "Step up")
- Night mode with low-light enhancement (Premium only)

### Lost Item Finder (NEW)
- Offline few-shot learning (3-4 clips or 12 photos per item)
- On-device embeddings with encrypted local storage
- Real-time object detection and matching via ML Kit/TensorFlow Lite
- Audio beacon guidance with stereo panning + haptic "hot/cold" feedback
- 5-10 FPS processing, ≤180ms per frame
- ≥85% success rate at ≤3m distance
- Airplane mode compatible (fully offline)

### Safety & Emergency
- Fall detection via accelerometer + gyroscope fusion
- 30-second confirmation countdown before automatic emergency contact
- GPS-enabled SOS with SMS alerts to emergency contacts
- All safety functions work offline

### Accessibility (WCAG 2.2 AA+)
- Touch targets ≥52dp/pt minimum
- Complete VoiceOver/TalkBack support
- High contrast color palette
- Haptic feedback for confirmations and alerts
- Large text options for seniors

### i18n Support
- Full EN/FR language parity
- Offline TTS voices for both languages
- Metric units throughout (meters, celsius)
- Localized emergency contact formats

## Technical Architecture

### Offline-First Design
- **No cloud dependency** for core safety features
- Camera frames never leave device
- Local usage metering (resets daily)
- Emergency functions work without internet

### Platform Support
- **iOS**: AVFoundation camera, Core ML inference, Core Motion sensors
- **Android**: CameraX, TensorFlow Lite + NNAPI, SensorManager
- **Minimum**: iPhone 12+ (iOS 15+), Pixel 6+ (Android 12+)

### Performance Targets
- Vision processing: ≥10 FPS @800px resolution
- Battery life: ≥2.5h continuous guidance at 50% brightness
- Thermal management: Degrades gracefully to 5 FPS under stress
- Memory footprint: <150MB including ML models

## Privacy & Compliance

### Data Protection
- **PIPEDA/Alberta PIPA** compliant
- No camera frames transmitted
- Usage metrics stored locally only
- Opt-in telemetry for performance data (anonymous)

### Safety Standards
- Emergency SMS includes GPS coordinates only
- Breakaway neck strap meets CPSIA safety standards
- Fall detection tuned to minimize false positives

## Project info

**URL**: https://lovable.dev/projects/9b6ba57d-0f87-4893-8630-92e53b225b3f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9b6ba57d-0f87-4893-8630-92e53b225b3f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9b6ba57d-0f87-4893-8630-92e53b225b3f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
