/**
 * Battery Guard - Monitors battery level and adjusts performance
 * Prevents excessive drain during guidance sessions
 */

class BatteryGuardClass {
  private battery: any = null;
  private batterySupported = 'getBattery' in navigator;
  private lowBatteryThreshold = 0.15; // 15%
  private hasAlerted = false;
  private isLowPowerMode = false;
  private callbacks: Set<(isLowPower: boolean) => void> = new Set();

  async initialize(): Promise<void> {
    if (!this.batterySupported) {
      console.warn('Battery API not supported');
      return;
    }

    try {
      this.battery = await (navigator as any).getBattery();
      
      // Set up battery event listeners
      this.battery.addEventListener('levelchange', this.handleLevelChange.bind(this));
      this.battery.addEventListener('chargingchange', this.handleChargingChange.bind(this));
      
      // Initial check
      this.checkBatteryLevel();
      
      console.log('Battery guard initialized');
    } catch (error) {
      console.warn('Failed to initialize battery guard:', error);
    }
  }

  private handleLevelChange(): void {
    this.checkBatteryLevel();
  }

  private handleChargingChange(): void {
    if (this.battery.charging && this.isLowPowerMode) {
      console.log('Device charging, exiting low power mode');
      this.setLowPowerMode(false);
      this.hasAlerted = false; // Reset alert flag when charging
    }
  }

  private checkBatteryLevel(): void {
    if (!this.battery) return;

    const level = this.battery.level;
    const isLow = level <= this.lowBatteryThreshold;

    if (isLow && !this.battery.charging) {
      if (!this.hasAlerted) {
        this.triggerLowBatteryAlert(level);
        this.hasAlerted = true;
      }
      
      if (!this.isLowPowerMode) {
        this.setLowPowerMode(true);
      }
    } else if (!isLow && this.isLowPowerMode && this.battery.charging) {
      // Exit low power mode when charging or level recovers
      this.setLowPowerMode(false);
      this.hasAlerted = false;
    }
  }

  private triggerLowBatteryAlert(level: number): void {
    const percentage = Math.round(level * 100);
    const message = `Battery low: ${percentage}%. Switching to power saving mode.`;
    
    // Announce via TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.volume = 0.8;
      utterance.rate = 1.0;
      speechSynthesis.speak(utterance);
    }

    // Visual notification
    const statusEl = document.getElementById('status-announcer');
    if (statusEl) {
      statusEl.textContent = message;
    }

    console.warn('Low battery alert triggered:', percentage + '%');
  }

  private setLowPowerMode(enabled: boolean): void {
    if (this.isLowPowerMode === enabled) return;
    
    this.isLowPowerMode = enabled;
    console.log('Low power mode:', enabled ? 'ENABLED' : 'DISABLED');
    
    // Notify all callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(enabled);
      } catch (error) {
        console.error('Battery guard callback error:', error);
      }
    });
  }

  // Subscribe to low power mode changes
  onLowPowerModeChange(callback: (isLowPower: boolean) => void): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // Get current battery info
  getBatteryInfo(): {
    level: number | null;
    charging: boolean | null;
    isLowPowerMode: boolean;
    supported: boolean;
  } {
    if (!this.battery) {
      return {
        level: null,
        charging: null,
        isLowPowerMode: this.isLowPowerMode,
        supported: this.batterySupported
      };
    }

    return {
      level: this.battery.level,
      charging: this.battery.charging,
      isLowPowerMode: this.isLowPowerMode,
      supported: this.batterySupported
    };
  }

  // Manual low power mode control
  setManualLowPowerMode(enabled: boolean): void {
    this.setLowPowerMode(enabled);
  }

  // Get recommended settings for low power mode
  getLowPowerSettings(): {
    targetFPS: number;
    enableHaptics: boolean;
    enableTTS: boolean;
    cameraResolution: 'low' | 'medium' | 'high';
  } {
    if (this.isLowPowerMode) {
      return {
        targetFPS: 15, // Reduced from 30
        enableHaptics: false,
        enableTTS: true, // Keep TTS for accessibility
        cameraResolution: 'low'
      };
    }

    return {
      targetFPS: 30,
      enableHaptics: true,
      enableTTS: true,
      cameraResolution: 'medium'
    };
  }

  isLowPower(): boolean {
    return this.isLowPowerMode;
  }

  isSupported(): boolean {
    return this.batterySupported;
  }
}

export const BatteryGuard = new BatteryGuardClass();