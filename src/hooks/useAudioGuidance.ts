import { useCallback, useRef, useEffect } from 'react';

export interface AudioGuidanceOptions {
  enabled: boolean;
  volume: number;
  spatialAudio: boolean;
}

export const useAudioGuidance = (options: AudioGuidanceOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Initialize Web Audio API
  useEffect(() => {
    if (!options.enabled) return;

    const initAudio = async () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext();
        
        const gainNode = context.createGain();
        const pannerNode = context.createStereoPanner();
        
        gainNode.connect(pannerNode);
        pannerNode.connect(context.destination);
        
        gainNode.gain.setValueAtTime(options.volume, context.currentTime);
        
        audioContextRef.current = context;
        gainNodeRef.current = gainNode;
        pannerNodeRef.current = pannerNode;
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [options.enabled, options.volume]);

  // Play directional guidance tone
  const playDirectionalTone = useCallback((
    direction: 'left' | 'center' | 'right',
    intensity: number = 0.5
  ) => {
    if (!options.enabled || !audioContextRef.current || !gainNodeRef.current || !pannerNodeRef.current) {
      return;
    }

    const context = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    const pannerNode = pannerNodeRef.current;

    // Stop any current oscillator
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
    }

    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    
    oscillator.connect(envelope);
    envelope.connect(gainNode);
    
    // Set frequency based on direction and intensity
    const baseFreq = 400;
    const freq = direction === 'left' ? baseFreq - 100 : 
                 direction === 'right' ? baseFreq + 100 : baseFreq;
    
    oscillator.frequency.setValueAtTime(freq, context.currentTime);
    oscillator.type = 'sine';
    
    // Set stereo pan based on direction
    const panValue = direction === 'left' ? -0.7 : 
                     direction === 'right' ? 0.7 : 0;
    pannerNode.pan.setValueAtTime(panValue, context.currentTime);
    
    // Create envelope for smooth tone
    const now = context.currentTime;
    const duration = 0.3;
    const volume = intensity * options.volume;
    
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(volume, now + 0.05);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    oscillatorRef.current = oscillator;
  }, [options.enabled, options.volume]);

  // Play proximity beacon (hot/cold feedback)
  const playProximityBeacon = useCallback((distance: number) => {
    if (!options.enabled || !audioContextRef.current) return;

    const context = audioContextRef.current;
    
    // Calculate beep rate based on distance (closer = faster beeps)
    const maxDistance = 1.0;
    const minInterval = 0.2; // Fastest beep interval (seconds)
    const maxInterval = 2.0; // Slowest beep interval (seconds)
    
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const interval = minInterval + (normalizedDistance * (maxInterval - minInterval));
    
    // Play beacon tone
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    
    oscillator.connect(envelope);
    envelope.connect(gainNodeRef.current!);
    
    oscillator.frequency.setValueAtTime(800, context.currentTime);
    oscillator.type = 'square';
    
    const now = context.currentTime;
    const beepDuration = 0.1;
    
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(options.volume * 0.3, now + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + beepDuration);
    
    oscillator.start(now);
    oscillator.stop(now + beepDuration);
    
    // Schedule next beep
    setTimeout(() => {
      if (options.enabled) {
        playProximityBeacon(distance);
      }
    }, interval * 1000);
  }, [options.enabled, options.volume]);

  // Play alert sound for obstacles
  const playObstacleAlert = useCallback(() => {
    if (!options.enabled || !audioContextRef.current) return;

    const context = audioContextRef.current;
    
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    
    oscillator.connect(envelope);
    envelope.connect(gainNodeRef.current!);
    
    // Use descending tone for alert
    const now = context.currentTime;
    const duration = 0.5;
    
    oscillator.frequency.setValueAtTime(1000, now);
    oscillator.frequency.exponentialRampToValueAtTime(400, now + duration);
    oscillator.type = 'sawtooth';
    
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(options.volume * 0.7, now + 0.05);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
  }, [options.enabled, options.volume]);

  // Speak text using Speech Synthesis API
  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!options.enabled || !window.speechSynthesis) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.volume = options.volume;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  }, [options.enabled, options.volume]);

  return {
    playDirectionalTone,
    playProximityBeacon,
    playObstacleAlert,
    speak,
    isSupported: !!window.AudioContext || !!(window as any).webkitAudioContext
  };
};