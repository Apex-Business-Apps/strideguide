/**
 * InstallManager - Handles PWA installation across platforms
 * Android/Desktop: uses beforeinstallprompt
 * iOS: provides manual instructions
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallState {
  canInstall: boolean;
  isInstalled: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  installType: 'native' | 'manual' | 'none';
}

class InstallManagerClass {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: ((state: InstallState) => void)[] = [];
  private currentState: InstallState = {
    canInstall: false,
    isInstalled: false,
    platform: 'unknown',
    installType: 'none'
  };

  constructor() {
    this.init();
  }

  private init(): void {
    this.detectPlatform();
    this.checkInstallState();
    this.setupEventListeners();
  }

  private detectPlatform(): void {
    const userAgent = navigator.userAgent;
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      this.currentState.platform = 'ios';
      this.currentState.installType = 'manual';
    } else if (/Android/.test(userAgent)) {
      this.currentState.platform = 'android';
      this.currentState.installType = 'native';
    } else {
      this.currentState.platform = 'desktop';
      this.currentState.installType = 'native';
    }
  }

  private checkInstallState(): void {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
    
    this.currentState.isInstalled = isStandalone;
    
    // If already installed, can't install again
    if (isStandalone) {
      this.currentState.canInstall = false;
    }
  }

  private setupEventListeners(): void {
    // Listen for beforeinstallprompt (Android/Desktop)
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt.bind(this));
    
    // Listen for app installed
    window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', this.handleDisplayModeChange.bind(this));
  }

  private handleBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.deferredPrompt = event as BeforeInstallPromptEvent;
    
    if (!this.currentState.isInstalled) {
      this.currentState.canInstall = true;
      this.notifyListeners();
    }
  }

  private handleAppInstalled(): void {
    this.currentState.isInstalled = true;
    this.currentState.canInstall = false;
    this.deferredPrompt = null;
    this.notifyListeners();
  }

  private handleDisplayModeChange(): void {
    this.checkInstallState();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.currentState }));
  }

  // Public API
  async showInstallPrompt(): Promise<{ success: boolean; outcome?: string }> {
    if (this.currentState.platform === 'ios') {
      // For iOS, we can't programmatically trigger install
      // The UI should show manual instructions
      return { success: false, outcome: 'manual_required' };
    }

    if (!this.deferredPrompt) {
      return { success: false, outcome: 'no_prompt' };
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      this.deferredPrompt = null;
      this.currentState.canInstall = false;
      this.notifyListeners();
      
      return { success: outcome === 'accepted', outcome };
    } catch (error) {
      console.error('Install prompt failed:', error);
      return { success: false, outcome: 'error' };
    }
  }

  getState(): InstallState {
    return { ...this.currentState };
  }

  subscribe(listener: (state: InstallState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately notify with current state
    listener({ ...this.currentState });
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Helper methods
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  getInstallInstructions(language: 'en' | 'fr' = 'en'): string[] {
    if (this.currentState.platform === 'ios') {
      return language === 'fr' ? [
        'Appuyez sur le bouton Partager en bas',
        'Faites défiler et appuyez sur "Sur l\'écran d\'accueil"',
        'Appuyez sur "Ajouter" en haut à droite',
        'L\'application apparaîtra sur votre écran d\'accueil'
      ] : [
        'Tap the Share button at the bottom',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" in the top right',
        'The app will appear on your home screen'
      ];
    } else {
      return language === 'fr' ? [
        'Appuyez sur le bouton "Installer l\'application"',
        'Confirmez l\'installation dans la boîte de dialogue',
        'L\'application sera ajoutée à votre appareil'
      ] : [
        'Tap the "Install App" button',
        'Confirm installation in the dialog',
        'The app will be added to your device'
      ];
    }
  }

  markDismissed(): void {
    // For iOS, we can store dismissal preference
    const timestamp = Date.now();
    localStorage.setItem('strideguide_install_dismissed', timestamp.toString());
    this.currentState.canInstall = false;
    this.notifyListeners();
  }

  // For debugging
  getDebugInfo(): Record<string, any> {
    return {
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches,
      hasDeferredPrompt: !!this.deferredPrompt,
      currentState: this.currentState,
      serviceWorkerSupported: 'serviceWorker' in navigator
    };
  }
}

export const InstallManager = new InstallManagerClass();