import { useState, useEffect, useCallback, useRef } from 'react';
import { PolicyManager } from '@/utils/PolicyManager';
import { useToast } from '@/hooks/use-toast';
import { EncryptedKVClass } from '@/crypto/kv';

export interface RecordingSegment {
  id: string;
  timestamp: number;
  duration: number; // seconds
  size: number; // bytes
  hasAudio: boolean;
  encrypted: boolean;
  filePath: string;
}

export interface RecordingSession {
  id: string;
  startTime: number;
  endTime: number | null;
  trigger: 'fall' | 'sos' | 'manual' | 'voice';
  ringBufferSegments: RecordingSegment[];
  liveSegments: RecordingSegment[];
  totalSize: number;
  hasPreEvent: boolean;
}

export interface ERMSettings {
  retentionHours: number;
  maxStorageGB: number;
  beepEnabled: boolean;
  audioOnlyMode: boolean;
  voiceActivation: boolean;
  tripleVolumePress: boolean;
}

export const useEmergencyRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [settings, setSettings] = useState<ERMSettings>({
    retentionHours: 168, // 7 days default
    maxStorageGB: 2.0,
    beepEnabled: true,
    audioOnlyMode: false,
    voiceActivation: true,
    tripleVolumePress: true
  });
  const [policy, setPolicy] = useState<{ audioAllowed: boolean; requiresBeep: boolean; region: string; consentModalRequired: boolean } | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { toast } = useToast();
  const ringBufferRef = useRef<RecordingSegment[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize policy and settings
  useEffect(() => {
    const mockPolicy = {
      audioAllowed: true,
      requiresBeep: false,
      region: 'CA',
      consentModalRequired: false
    };
    setPolicy(mockPolicy);

    loadStoredSessions();
    setIsInitialized(true);
  }, [loadStoredSessions]);

  // Simulate ring buffer management (2-5 min pre-event)
  const maintainRingBuffer = useCallback(() => {
    const maxRingBufferDuration = 300; // 5 minutes in seconds
    const now = Date.now();
    
    // Add new segment to ring buffer (simulated)
    const newSegment: RecordingSegment = {
      id: `ring_${now}`,
      timestamp: now,
      duration: 10, // 10 second segments
      size: 1024 * 1024 * 0.5, // ~500KB per segment (simulated)
      hasAudio: policy?.audioAllowed ?? false,
      encrypted: true,
      filePath: `/secure/ring_${now}.enc`
    };

    ringBufferRef.current.push(newSegment);

    // Remove old segments beyond ring buffer duration
    const cutoffTime = now - (maxRingBufferDuration * 1000);
    ringBufferRef.current = ringBufferRef.current.filter(
      segment => segment.timestamp >= cutoffTime
    );
  }, [policy]);

  // Start emergency recording
  const startRecording = useCallback(async (trigger: RecordingSession['trigger']) => {
    if (!policy || isRecording) return;

    // Check consent for all-party states
    if (policy.region === 'US_ALL_PARTY' && !PolicyManager.hasConsent()) {
      toast({
        title: "Recording Consent Required",
        description: "All-party consent needed in this jurisdiction. Audio will be disabled.",
        variant: "destructive"
      });
    }

    const sessionId = `erm_${Date.now()}`;
    const newSession: RecordingSession = {
      id: sessionId,
      startTime: Date.now(),
      endTime: null,
      trigger,
      ringBufferSegments: [...ringBufferRef.current], // Capture pre-event
      liveSegments: [],
      totalSize: ringBufferRef.current.reduce((sum, seg) => sum + seg.size, 0),
      hasPreEvent: ringBufferRef.current.length > 0
    };

    setCurrentSession(newSession);
    setIsRecording(true);

    // Start live recording simulation
    recordingIntervalRef.current = setInterval(() => {
      const segment: RecordingSegment = {
        id: `live_${Date.now()}`,
        timestamp: Date.now(),
        duration: 10,
        size: policy.audioAllowed ? 1024 * 1024 * 0.8 : 1024 * 512, // Smaller for video-only
        hasAudio: policy.audioAllowed,
        encrypted: true,
        filePath: `/secure/live_${Date.now()}.enc`
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        liveSegments: [...prev.liveSegments, segment],
        totalSize: prev.totalSize + segment.size
      } : null);
    }, 10000); // New segment every 10 seconds

    // Start periodic beep if required
    if (policy.requiresBeep && settings.beepEnabled) {
      beepIntervalRef.current = setInterval(() => {
        // Simulate beep sound
        if (navigator.vibrate) {
          navigator.vibrate([100, 100, 100]); // Triple beep pattern
        }
        console.log('ERM: Recording beep');
      }, 5000); // Beep every 5 seconds
    }

    // Haptic heartbeat
    if (navigator.vibrate) {
      const heartbeatPattern = [50, 50, 50, 500]; // Quick double pulse
      navigator.vibrate(heartbeatPattern);
    }

    // TTS announcement with error handling
    if ('speechSynthesis' in window && window.speechSynthesis) {
      try {
        const utterance = new SpeechSynthesisUtterance('Emergency recording started');
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('[ERM] Speech synthesis failed:', err);
        // Continue without TTS - not critical for functionality
      }
    }

    toast({
      title: "Emergency Recording Active",
      description: `Recording ${policy.audioAllowed ? 'video+audio' : 'video only'}. Tap STOP to end.`,
      variant: "destructive"
    });

    // Send ICE SMS notification (simulated)
    await sendICENotification(trigger);

  }, [policy, isRecording, settings, toast, sendICENotification]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !currentSession) return;

    // Clear intervals
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }

    // Finalize session
    const finalSession: RecordingSession = {
      ...currentSession,
      endTime: Date.now()
    };

    setSessions(prev => [...prev, finalSession]);
    setCurrentSession(null);
    setIsRecording(false);

    // TTS announcement with error handling
    if ('speechSynthesis' in window && window.speechSynthesis) {
      try {
        const utterance = new SpeechSynthesisUtterance('Emergency recording stopped');
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('[ERM] Speech synthesis failed:', err);
        // Continue without TTS - not critical for functionality
      }
    }

    // Store session metadata (encrypted)
    storeSession(finalSession);

    toast({
      title: "Recording Stopped",
      description: `Session saved to Evidence Locker. Duration: ${Math.round((finalSession.endTime! - finalSession.startTime) / 1000)}s`,
    });

  }, [isRecording, currentSession, storeSession, toast]);

  // Send ICE SMS notification
  const sendICENotification = useCallback(async (trigger: string) => {
    // Simulate SMS sending (offline via cellular)
    const message = `StrideGuide Emergency: ${trigger} detected at ${new Date().toLocaleString()}. Recording active.`;
    
    console.log('ICE SMS sent:', message);
    
    toast({
      title: "Emergency Contact Notified",
      description: "SMS sent with timestamp and location (if available)"
    });
  }, [toast]);

  // Voice activation listener
  useEffect(() => {
    if (!settings.voiceActivation || !isInitialized) return;

    let recognition: SpeechRecognition | null = null;

    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = (window as Window & { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;
      recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        if (transcript.includes('strideguide record') || transcript.includes('stride guide record')) {
          startRecording('voice');
        }
      };

      recognition.start();
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [settings.voiceActivation, isInitialized, startRecording]);

  // Load stored sessions from encrypted storage
  const loadStoredSessions = useCallback(async () => {
    try {
      const kv = new EncryptedKVClass();
      await kv.initialize();
      const data = await kv.retrieve('sessions');
      
      if (data) {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(data);
        const parsedSessions = JSON.parse(jsonStr) as RecordingSession[];
        setSessions(parsedSessions);
        
        // Calculate storage used
        const totalSize = parsedSessions.reduce((sum: number, session: RecordingSession) => 
          sum + session.totalSize, 0
        );
        setStorageUsed(totalSize / (1024 * 1024 * 1024)); // Convert to GB
      }
    } catch (error) {
      console.error('Failed to load stored sessions:', error);
    }
  }, []);

  // Store session in encrypted storage
  const storeSession = useCallback(async (session: RecordingSession) => {
    try {
      const kv = new EncryptedKVClass();
      await kv.initialize();
      const currentData = await kv.retrieve('sessions');
      let sessions: RecordingSession[] = [];
      
      if (currentData) {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(currentData);
        sessions = JSON.parse(jsonStr);
      }
      
      sessions.push(session);
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(sessions));
      await kv.store('sessions', data);
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }, []);

  // Cleanup old sessions based on retention policy
  const cleanupOldSessions = useCallback(() => {
    const cutoffTime = Date.now() - (settings.retentionHours * 60 * 60 * 1000);
    setSessions(prev => prev.filter(session => session.startTime >= cutoffTime));
  }, [settings.retentionHours]);

  // Start ring buffer when initialized
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(maintainRingBuffer, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [isInitialized, maintainRingBuffer]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(cleanupOldSessions, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [cleanupOldSessions]);

  return {
    // State
    isRecording,
    currentSession,
    sessions,
    settings,
    policy,
    storageUsed,
    isInitialized,
    
    // Actions
    startRecording,
    stopRecording,
    updateSettings: setSettings,
    
    // Computed
    canRecord: policy?.audioAllowed ?? false,
    needsConsent: policy?.consentModalRequired ?? false,
    storagePercentage: (storageUsed / settings.maxStorageGB) * 100,
    hasPreEventBuffer: ringBufferRef.current.length > 0
  };
};