// @stride/utm-tracker v1 — Preserve marketing attribution across site→app boundary

export class UTMTracker {
  private static readonly UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  private static readonly STORAGE_KEY = 'stride_utm_params';
  private static readonly EXPIRY_KEY = 'stride_utm_expiry';
  private static readonly TTL_HOURS = 24;

  /**
   * Capture UTM parameters from current URL and store them
   */
  static capture(): void {
    const params = new URLSearchParams(window.location.search);
    const utmData: Record<string, string> = {};
    
    this.UTM_PARAMS.forEach(param => {
      const value = params.get(param);
      if (value) {
        utmData[param] = value;
      }
    });

    if (Object.keys(utmData).length > 0) {
      const expiry = Date.now() + (this.TTL_HOURS * 60 * 60 * 1000);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(utmData));
      localStorage.setItem(this.EXPIRY_KEY, expiry.toString());
      console.log('[UTM] Captured:', utmData);
    }
  }

  /**
   * Get stored UTM parameters if not expired
   */
  static get(): Record<string, string> | null {
    const expiry = localStorage.getItem(this.EXPIRY_KEY);
    if (!expiry || Date.now() > parseInt(expiry)) {
      this.clear();
      return null;
    }

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      this.clear();
      return null;
    }
  }

  /**
   * Build a URL with UTM parameters appended
   */
  static buildURL(baseURL: string, additionalParams?: Record<string, string>): string {
    const url = new URL(baseURL, window.location.origin);
    const utmData = this.get();
    
    if (utmData) {
      Object.entries(utmData).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Clear stored UTM data
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.EXPIRY_KEY);
  }

  /**
   * Track that user entered app (for analytics)
   */
  static trackAppEntry(): void {
    const utmData = this.get();
    if (utmData) {
      console.log('[UTM] App entry with attribution:', utmData);
      // Send to analytics if configured
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'app_entry', {
          ...utmData,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}

// Auto-capture UTM params on page load
if (typeof window !== 'undefined') {
  UTMTracker.capture();
}
