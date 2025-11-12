/**
 * SpeechSynthesisManager - Centralized speech synthesis lifecycle management
 * Ensures proper cleanup on unmount and prevents speech leaks
 */

import { useEffect, useRef } from 'react';
import { logger } from './ProductionLogger';

class SpeechSynthesisManager {
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();
  private cleanupCallbacks: Set<() => void> = new Set();

  /**
   * Speak text with automatic cleanup tracking
   */
  speak(text: string, options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    onEnd?: () => void;
    onError?: (error: Event) => void;
  }): SpeechSynthesisUtterance | null {
    if (!('speechSynthesis' in window)) {
      logger.warn('SpeechSynthesis not supported in this browser');
      return null;
    }

    try {
      // Cancel any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || 'en-US';
      utterance.rate = options?.rate || 0.9;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 0.8;

      // Track active utterance
      this.activeUtterances.add(utterance);

      // Cleanup on end
      utterance.onend = () => {
        this.activeUtterances.delete(utterance);
        options?.onEnd?.();
      };

      // Error handling
      utterance.onerror = (error) => {
        this.activeUtterances.delete(utterance);
        logger.error('Speech synthesis error', { error: error.error });
        options?.onError?.(error);
      };

      window.speechSynthesis.speak(utterance);
      return utterance;
    } catch (error) {
      logger.error('Failed to speak text', { error });
      return null;
    }
  }

  /**
   * Cancel all active speech
   */
  cancelAll(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.activeUtterances.clear();
    }
  }

  /**
   * Register cleanup callback for component unmount
   */
  registerCleanup(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Execute all cleanup callbacks (call on unmount)
   */
  cleanup(): void {
    this.cancelAll();
    this.cleanupCallbacks.forEach(cb => cb());
    this.cleanupCallbacks.clear();
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return 'speechSynthesis' in window && window.speechSynthesis.speaking;
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }
}

// Export singleton instance
export const speechManager = new SpeechSynthesisManager();

/**
 * React hook for speech synthesis with automatic cleanup
 */
export function useSpeechSynthesis() {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Register cleanup
    cleanupRef.current = speechManager.registerCleanup(() => {
      speechManager.cancelAll();
    });

    // Cleanup on unmount
    return () => {
      cleanupRef.current?.();
      speechManager.cancelAll();
    };
  }, []);

  return {
    speak: speechManager.speak.bind(speechManager),
    cancel: speechManager.cancelAll.bind(speechManager),
    isSpeaking: speechManager.isSpeaking.bind(speechManager),
    pause: speechManager.pause.bind(speechManager),
    resume: speechManager.resume.bind(speechManager),
  };
}

// For non-React contexts
export { speechManager as default };
