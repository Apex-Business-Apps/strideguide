// @stride/install v2 – idempotent

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
  showHelper: boolean;
}

class InstallManagerClass {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: Array<(state: InstallState) => void> = [];
  private state: InstallState;
  private initialized = false;

  constructor() {
    this.state = {
      canInstall: false,
      isInstalled: false,
      platform: 'unknown',
      showHelper: false
    };
    this.init();
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    this.detectPlatform();
    this.checkInstallState();
    this.setupEventListeners();
  }

  private detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad/.test(userAgent)) {
      this.state.platform = 'ios';
    } else if (/android/.test(userAgent)) {
      this.state.platform = 'android';
    } else {
      this.state.platform = 'desktop';
    }
  }

  private checkInstallState() {
    // Check if running in standalone mode
    this.state.isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
  }

  private setupEventListeners() {
    // Attach once guard for beforeinstallprompt
    if (!this.deferredPrompt) {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e as BeforeInstallPromptEvent;
        this.state.canInstall = true;
        this.notifyListeners();
      }, { once: false });
    }

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.state.canInstall = false;
      this.state.isInstalled = true;
      this.notifyListeners();
    });
  }

  getInstallState(): InstallState {
    return { ...this.state };
  }

  async promptInstall(): Promise<boolean> {
    // Android/desktop: use native prompt
    if (this.deferredPrompt && (this.state.platform === 'android' || this.state.platform === 'desktop')) {
      try {
        await this.deferredPrompt.prompt();
        const choiceResult = await this.deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          this.deferredPrompt = null;
          this.state.canInstall = false;
          this.notifyListeners();
          return true;
        }
        return false;
      } catch (error) {
        console.warn('Install prompt failed:', error);
        return false;
      }
    }

    // iOS: show helper dialog
    if (this.state.platform === 'ios') {
      this.state.showHelper = true;
      this.notifyListeners();
      return true;
    }

    return false;
  }

  hideHelper() {
    this.state.showHelper = false;
    this.notifyListeners();
  }

  subscribe(listener: (state: InstallState) => void): () => void {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.getInstallState());
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getInstallState()));
  }
}

export const InstallManager = new InstallManagerClass();