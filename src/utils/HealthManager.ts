/**
 * Health Manager - Monitors app health and provides user feedback
 * Handles camera/ML errors gracefully without infinite loops
 */

interface HealthStatus {
  camera: 'ok' | 'error' | 'unavailable';
  ml: 'ok' | 'error' | 'loading';
  audio: 'ok' | 'blocked' | 'unavailable';
  battery: 'ok' | 'low' | 'critical';
  overall: 'healthy' | 'degraded' | 'critical';
}

class HealthManagerClass {
  private status: HealthStatus = {
    camera: 'ok',
    ml: 'loading',
    audio: 'ok',
    battery: 'ok',
    overall: 'healthy'
  };

  private errorCounts = {
    camera: 0,
    ml: 0,
    audio: 0
  };

  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds
  private lastErrorAnnouncement = 0;
  private announcementCooldown = 10000; // 10 seconds between announcements
  private callbacks: Set<(status: HealthStatus) => void> = new Set();

  // Report camera error
  reportCameraError(error: Error): void {
    this.errorCounts.camera++;
    console.error('Camera error reported:', error.message);

    if (this.errorCounts.camera >= this.maxRetries) {
      this.status.camera = 'unavailable';
      this.announceError('Guidance paused. Camera not available.');
    } else {
      this.status.camera = 'error';
      setTimeout(() => {
        this.resetErrorCount('camera');
      }, this.retryDelay);
    }

    this.updateOverallStatus();
  }

  // Report ML inference error
  reportMLError(error: Error): void {
    this.errorCounts.ml++;
    console.error('ML error reported:', error.message);

    if (this.errorCounts.ml >= this.maxRetries) {
      this.status.ml = 'error';
      this.announceError('Object detection unavailable. Using basic guidance.');
    } else {
      setTimeout(() => {
        this.resetErrorCount('ml');
      }, this.retryDelay);
    }

    this.updateOverallStatus();
  }

  // Report audio error
  reportAudioError(error: Error): void {
    this.errorCounts.audio++;
    console.error('Audio error reported:', error.message);

    if (this.errorCounts.audio >= this.maxRetries) {
      this.status.audio = 'unavailable';
      this.announceError('Audio unavailable. Check device settings.');
    } else {
      this.status.audio = 'blocked';
      setTimeout(() => {
        this.resetErrorCount('audio');
      }, this.retryDelay);
    }

    this.updateOverallStatus();
  }

  // Reset specific error count (after successful recovery)
  resetErrorCount(component: keyof typeof this.errorCounts): void {
    this.errorCounts[component] = 0;
    
    // Update status to OK if error count is reset
    switch (component) {
      case 'camera':
        if (this.status.camera === 'error') {
          this.status.camera = 'ok';
        }
        break;
      case 'ml':
        if (this.status.ml === 'error') {
          this.status.ml = 'ok';
        }
        break;
      case 'audio':
        if (this.status.audio === 'blocked') {
          this.status.audio = 'ok';
        }
        break;
    }

    this.updateOverallStatus();
  }

  // Update component status directly
  setComponentStatus(component: keyof HealthStatus, status: string): void {
    if (component === 'overall') return; // Overall is computed

    (this.status as any)[component] = status;
    this.updateOverallStatus();
  }

  private updateOverallStatus(): void {
    const criticalErrors = [
      this.status.camera === 'unavailable',
      this.status.ml === 'error',
      this.status.battery === 'critical'
    ].filter(Boolean).length;

    const degradedErrors = [
      this.status.camera === 'error',
      this.status.audio === 'blocked',
      this.status.battery === 'low'
    ].filter(Boolean).length;

    let newOverallStatus: HealthStatus['overall'];
    
    if (criticalErrors > 0) {
      newOverallStatus = 'critical';
    } else if (degradedErrors > 0 || this.status.ml === 'loading') {
      newOverallStatus = 'degraded';
    } else {
      newOverallStatus = 'healthy';
    }

    if (newOverallStatus !== this.status.overall) {
      this.status.overall = newOverallStatus;
      console.log('Health status changed to:', newOverallStatus);
      
      // Notify callbacks
      this.notifyCallbacks();
    }
  }

  private announceError(message: string): void {
    const now = Date.now();
    
    // Throttle error announcements to prevent spam
    if (now - this.lastErrorAnnouncement < this.announcementCooldown) {
      return;
    }

    this.lastErrorAnnouncement = now;

    // Announce via TTS
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel(); // Cancel any ongoing speech
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.volume = 0.8;
        utterance.rate = 1.0;
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('Failed to announce error:', error);
      }
    }

    // Visual notification
    const statusEl = document.getElementById('status-announcer');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  // Provide retry button functionality
  createRetryHandler(component: keyof typeof this.errorCounts, retryFunction: () => Promise<void>): () => void {
    return async () => {
      try {
        console.log(`Retrying ${component}...`);
        await retryFunction();
        this.resetErrorCount(component);
        this.announceError(`${component} restored successfully.`);
      } catch (error) {
        console.error(`Retry failed for ${component}:`, error);
        this.announceError(`Retry failed. Please check device settings.`);
      }
    };
  }

  // Get current health status
  getStatus(): HealthStatus {
    return { ...this.status };
  }

  // Get detailed health report
  getHealthReport(): {
    status: HealthStatus;
    errorCounts: typeof this.errorCounts;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    if (this.status.camera === 'unavailable') {
      recommendations.push('Camera permission required for guidance features');
    }
    
    if (this.status.audio === 'blocked') {
      recommendations.push('Tap screen to enable audio feedback');
    }
    
    if (this.status.ml === 'error') {
      recommendations.push('Object detection may be limited on this device');
    }
    
    if (this.status.battery === 'low') {
      recommendations.push('Connect charger for extended guidance sessions');
    }

    return {
      status: this.getStatus(),
      errorCounts: { ...this.errorCounts },
      recommendations
    };
  }

  // Subscribe to health changes
  onHealthChange(callback: (status: HealthStatus) => void): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.getStatus());
      } catch (error) {
        console.error('Health manager callback error:', error);
      }
    });
  }

  // Check if specific features are available
  isFeatureAvailable(feature: 'guidance' | 'finder' | 'sos' | 'audio'): boolean {
    switch (feature) {
      case 'guidance':
        return this.status.camera !== 'unavailable' && this.status.overall !== 'critical';
      case 'finder':
        return this.status.camera !== 'unavailable' && this.status.ml !== 'error';
      case 'sos':
        return true; // SOS should always be available
      case 'audio':
        return this.status.audio === 'ok';
      default:
        return false;
    }
  }

  // Get user-friendly status message
  getStatusMessage(): string {
    switch (this.status.overall) {
      case 'healthy':
        return 'All systems operational';
      case 'degraded':
        return 'Some features may be limited';
      case 'critical':
        return 'Essential features unavailable';
      default:
        return 'Status unknown';
    }
  }

  // Reset all error states (for manual recovery)
  reset(): void {
    this.errorCounts = { camera: 0, ml: 0, audio: 0 };
    this.status = {
      camera: 'ok',
      ml: 'ok',
      audio: 'ok',
      battery: 'ok',
      overall: 'healthy'
    };
    this.notifyCallbacks();
    console.log('Health manager reset');
  }
}

export const HealthManager = new HealthManagerClass();