/**
 * WakeLockManager - Prevents screen dimming during guidance
 * Uses Screen Wake Lock API with graceful fallback
 */

class WakeLockManagerClass {
  private wakeLock: WakeLockSentinel | null = null;
  private wakeLockSupported = 'wakeLock' in navigator;
  private deniedCount = 0;
  private maxDenials = 2;

  async request(): Promise<void> {
    if (!this.wakeLockSupported) {
      console.warn('Wake Lock API not supported');
      throw new Error('Wake Lock not supported');
    }

    if (this.wakeLock && !this.wakeLock.released) {
      console.log('Wake lock already active');
      return;
    }

    try {
      console.log('Requesting wake lock...');
      this.wakeLock = await navigator.wakeLock.request('screen');
      
      this.wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
        this.wakeLock = null;
      });

      // Re-acquire wake lock when page becomes visible
      if (!document.addEventListener) {
        console.warn('Document event listeners not supported');
      } else {
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      }
      
      console.log('Screen wake lock acquired successfully');
    } catch (error) {
      this.deniedCount++;
      console.error('Failed to acquire wake lock:', error);
      
      if (this.deniedCount >= this.maxDenials) {
        // Show settings tip after multiple denials
        const statusEl = document.getElementById('status-announcer');
        if (statusEl) {
          statusEl.textContent = 'Screen may dim during guidance. Check device settings to keep screen on.';
        }
      }
      
      throw error;
    }
  }

  release(): void {
    if (this.wakeLock && !this.wakeLock.released) {
      try {
        this.wakeLock.release();
        console.log('Wake lock manually released');
      } catch (error) {
        console.error('Failed to release wake lock:', error);
      }
    }

    this.wakeLock = null;

    try {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    } catch (error) {
      console.warn('Failed to remove visibility change listener:', error);
    }
  }

  private async handleVisibilityChange(): Promise<void> {
    if (this.wakeLock !== null && document.visibilityState === 'visible') {
      try {
        console.log('Page became visible, re-acquiring wake lock...');
        await this.request();
      } catch (error) {
        console.error('Failed to re-acquire wake lock on visibility change:', error);
      }
    } else if (document.visibilityState === 'hidden') {
      console.log('Page became hidden, wake lock may be released automatically');
    }
  }

  // Reset denial count when user manually enables
  resetDenialCount(): void {
    this.deniedCount = 0;
  }

  isActive(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }

  isSupported(): boolean {
    return this.wakeLockSupported;
  }

  getHelpText(): string {
    if (!this.wakeLockSupported) {
      return 'Wake Lock is not supported on this device. Please manually keep your screen on during guidance.';
    }
    
    return 'If screen dimming still occurs, check your device power settings and browser permissions.';
  }
}

export const WakeLockManager = new WakeLockManagerClass();