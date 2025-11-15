/**
 * SOS Guard - Rate limiting and safety for emergency SOS functionality
 * Prevents accidental triggers and implements cooldown periods
 */

class SOSGuardClass {
  private isPressed = false;
  private startTime = 0;
  private lastTrigger = 0;
  private requiredHoldTime = 1200; // 1.2 seconds
  private cooldownTime = 15000; // 15 seconds
  private cancelWindow = 3000; // 3 seconds to cancel after trigger
  private holdTimer: NodeJS.Timeout | null = null;
  private cancelTimer: NodeJS.Timeout | null = null;
  private callbacks: {
    onStart?: () => void;
    onProgress?: (progress: number) => void;
    onTrigger?: () => void;
    onCancel?: () => void;
    onCooldown?: (remaining: number) => void;
  } = {};

  setCallbacks(callbacks: typeof this.callbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  startPress(): boolean {
    const now = Date.now();
    
    // Check cooldown
    const timeSinceLastTrigger = now - this.lastTrigger;
    if (timeSinceLastTrigger < this.cooldownTime) {
      const remaining = Math.ceil((this.cooldownTime - timeSinceLastTrigger) / 1000);
      console.warn(`SOS cooldown active: ${remaining}s remaining`);
      
      this.callbacks.onCooldown?.(remaining);
      
      // Announce cooldown
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`SOS cooldown: ${remaining} seconds remaining`);
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
      }
      
      return false;
    }

    if (this.isPressed) {
      console.warn('SOS already in progress');
      return false;
    }

    console.log('SOS press started');
    this.isPressed = true;
    this.startTime = now;
    
    this.callbacks.onStart?.();
    
    // Start progress updates with safety checks
    this.startProgressUpdates();
    
    // Set timer for trigger
    this.holdTimer = setTimeout(() => {
      if (this.isPressed) { // Safety check
        this.triggerSOS();
      }
    }, this.requiredHoldTime);

    return true;
  }

  endPress(): void {
    if (!this.isPressed) return;

    console.log('SOS press ended');
    this.isPressed = false;
    
    // Clear timers
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }

    // If released before required time, cancel
    const holdDuration = Date.now() - this.startTime;
    if (holdDuration < this.requiredHoldTime) {
      console.log('SOS cancelled - insufficient hold time');
      this.callbacks.onCancel?.();
    }
  }

  private startProgressUpdates(): void {
    const updateProgress = () => {
      if (!this.isPressed) return;
      
      const elapsed = Date.now() - this.startTime;
      const progress = Math.min(elapsed / this.requiredHoldTime, 1.0);
      
      this.callbacks.onProgress?.(progress);
      
      if (progress < 1.0) {
        requestAnimationFrame(updateProgress);
      }
    };
    
    requestAnimationFrame(updateProgress);
  }

  private triggerSOS(): void {
    if (!this.isPressed) return;

    console.log('SOS triggered!');
    this.isPressed = false;
    this.lastTrigger = Date.now();
    
    // Clear hold timer
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }

    // Start cancel window
    this.startCancelWindow();
    
    this.callbacks.onTrigger?.();
  }

  private startCancelWindow(): void {
    console.log('SOS cancel window started (3 seconds)');
    
    // Announce cancel option
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Emergency SOS triggered. Say "cancel" within 3 seconds to abort.');
      utterance.volume = 1.0;
      utterance.rate = 1.1;
      speechSynthesis.speak(utterance);
    }

    // Set up voice recognition for cancel
    this.setupVoiceCancel();
    
    // Timer for cancel window
    this.cancelTimer = setTimeout(() => {
      console.log('SOS cancel window expired');
      this.cancelTimer = null;
    }, this.cancelWindow);
  }

  private setupVoiceCancel(): void {
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('Speech recognition not supported for SOS cancel');
      return;
    }

    const SpeechRecognitionAPI = (window as Window & { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('Voice recognition result:', transcript);
      
      if (transcript.includes('cancel') || transcript.includes('stop') || transcript.includes('abort')) {
        this.cancelSOS();
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Voice recognition error:', event.error);
    };
    
    recognition.onend = () => {
      console.log('Voice recognition ended');
    };
    
    try {
      recognition.start();
      
      // Stop recognition after cancel window
      setTimeout(() => {
        try {
          recognition.stop();
        } catch (_error) {
          // Recognition may already be stopped
        }
      }, this.cancelWindow);
      
    } catch (error) {
      console.warn('Failed to start voice recognition for SOS cancel:', error);
    }
  }

  cancelSOS(): boolean {
    if (!this.cancelTimer) {
      console.log('SOS cancel window expired or not active');
      return false;
    }

    console.log('SOS manually cancelled');
    
    clearTimeout(this.cancelTimer);
    this.cancelTimer = null;
    
    this.callbacks.onCancel?.();
    
    // Announce cancellation
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Emergency SOS cancelled');
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }

    return true;
  }

  // Get current state
  getState(): {
    isPressed: boolean;
    isInCooldown: boolean;
    cooldownRemaining: number;
    isInCancelWindow: boolean;
    progress: number;
  } {
    const now = Date.now();
    const timeSinceLastTrigger = now - this.lastTrigger;
    const isInCooldown = timeSinceLastTrigger < this.cooldownTime;
    const cooldownRemaining = isInCooldown ? this.cooldownTime - timeSinceLastTrigger : 0;
    
    let progress = 0;
    if (this.isPressed) {
      const elapsed = now - this.startTime;
      progress = Math.min(elapsed / this.requiredHoldTime, 1.0);
    }

    return {
      isPressed: this.isPressed,
      isInCooldown,
      cooldownRemaining,
      isInCancelWindow: this.cancelTimer !== null,
      progress
    };
  }

  // Manual reset (for testing or admin override)
  reset(): void {
    console.log('SOS guard reset');
    
    this.isPressed = false;
    this.lastTrigger = 0;
    
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = null;
    }
  }

  // Configuration
  setConfig(config: {
    requiredHoldTime?: number;
    cooldownTime?: number;
    cancelWindow?: number;
  }): void {
    if (config.requiredHoldTime) this.requiredHoldTime = config.requiredHoldTime;
    if (config.cooldownTime) this.cooldownTime = config.cooldownTime;
    if (config.cancelWindow) this.cancelWindow = config.cancelWindow;
    
    console.log('SOS guard config updated:', {
      requiredHoldTime: this.requiredHoldTime,
      cooldownTime: this.cooldownTime,
      cancelWindow: this.cancelWindow
    });
  }
}

export const SOSGuard = new SOSGuardClass();