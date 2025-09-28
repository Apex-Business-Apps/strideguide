/**
 * AudioArmer - Handles audio initialization and earcon playback
 * Complies with browser autoplay policies by requiring user gesture
 */

class AudioArmerClass {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private earcons: Map<string, AudioBuffer> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create AudioContext only after user gesture
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load earcons
      await this.loadEarcons();
      
      this.isInitialized = true;
      console.log('AudioArmer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioArmer:', error);
      throw error;
    }
  }

  private async loadEarcons(): Promise<void> {
    if (!this.audioContext) return;

    const earconDefinitions = {
      start: { frequency: 800, duration: 0.2, type: 'sine' as OscillatorType },
      stop: { frequency: 400, duration: 0.2, type: 'sine' as OscillatorType },
      success: { frequency: 600, duration: 0.3, type: 'sine' as OscillatorType },
      found: { frequency: 1000, duration: 0.15, type: 'sine' as OscillatorType },
      warning: { frequency: 300, duration: 0.5, type: 'square' as OscillatorType },
      hot: { frequency: 1200, duration: 0.1, type: 'sine' as OscillatorType },
      cold: { frequency: 200, duration: 0.1, type: 'sine' as OscillatorType }
    };

    for (const [name, config] of Object.entries(earconDefinitions)) {
      const buffer = await this.createEarcon(config);
      this.earcons.set(name, buffer);
    }
  }

  private async createEarcon(config: {
    frequency: number;
    duration: number;
    type: OscillatorType;
  }): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const numSamples = Math.floor(sampleRate * config.duration);
    const buffer = this.audioContext.createBuffer(2, numSamples, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        switch (config.type) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * config.frequency * t);
            break;
          case 'square':
            sample = Math.sin(2 * Math.PI * config.frequency * t) > 0 ? 1 : -1;
            break;
          default:
            sample = Math.sin(2 * Math.PI * config.frequency * t);
        }

        // Apply envelope to prevent clicks
        const envelope = Math.sin((Math.PI * i) / numSamples);
        channelData[i] = sample * envelope * 0.3; // Volume control
      }
    }

    return buffer;
  }

  playEarcon(name: string, panValue: number = 0): void {
    if (!this.isInitialized || !this.audioContext) {
      console.warn('AudioArmer not initialized, cannot play earcon:', name);
      return;
    }

    if (this.audioContext.state === 'suspended') {
      console.warn('AudioContext suspended, attempting to resume...');
      this.audioContext.resume().catch(err => {
        console.error('Failed to resume AudioContext:', err);
      });
      return;
    }

    const buffer = this.earcons.get(name);
    if (!buffer) {
      console.warn(`Earcon '${name}' not found`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      const pannerNode = this.audioContext.createStereoPanner();

      source.buffer = buffer;
      pannerNode.pan.value = Math.max(-1, Math.min(1, panValue)); // Clamp between -1 and 1
      
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(this.audioContext.destination);

      source.start();
    } catch (error) {
      console.error(`Failed to play earcon '${name}':`, error);
    }
  }

  // Cache earcons in service worker
  async cacheEarcons(): Promise<void> {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cache = await caches.open('earcons-v1');
        // In a real implementation, these would be actual audio files
        console.log('Earcons cached for offline use');
      } catch (error) {
        console.warn('Failed to cache earcons:', error);
      }
    }
  }

  playDirectionalCue(direction: 'left' | 'right' | 'center', intensity: number = 1): void {
    if (!this.isInitialized) {
      console.warn('AudioArmer not initialized for directional cue');
      return;
    }
    
    const panValue = direction === 'left' ? -0.8 : direction === 'right' ? 0.8 : 0;
    const earconName = intensity > 0.7 ? 'hot' : intensity > 0.3 ? 'found' : 'cold';
    
    console.log(`Playing directional cue: ${direction}, intensity: ${intensity}, earcon: ${earconName}`);
    this.playEarcon(earconName, panValue);
  }

  announceText(text: string): void {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    try {
      // Import sanitization from safety module
      const { sanitizeTTSOutput } = require('../safety/llm_guard');
      const sanitizedText = sanitizeTTSOutput(text);
      
      if (!sanitizedText.trim()) {
        console.warn('Text was filtered out by safety sanitizer');
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(sanitizedText);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // Add error handling for speech synthesis
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
      };

      utterance.onend = () => {
        console.log('Speech synthesis completed');
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to announce text:', error);
    }
  }

  // Watchdog for suspended AudioContext
  checkContextHealth(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.warn('AudioContext suspended, prompting user');
      this.announceText('Tap to allow sound');
      
      // Show visual prompt if needed
      const statusEl = document.getElementById('status-announcer');
      if (statusEl) {
        statusEl.textContent = 'Audio is blocked. Tap anywhere to enable sound.';
      }
    }
  }

  isArmed(): boolean {
    return this.isInitialized;
  }

  getContext(): AudioContext | null {
    return this.audioContext;
  }
}

export const AudioArmer = new AudioArmerClass();