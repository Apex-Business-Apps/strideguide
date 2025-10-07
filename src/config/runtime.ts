/**
 * Runtime Configuration Manager
 * Loads feature flags from /config/runtime.json at app boot
 * Falls back to safe defaults if file missing or malformed
 * Single artifact deployment - only JSON changes between environments
 */

export interface RuntimeConfig {
  enablePayments: boolean;
  enableNewAuth: boolean;
  enableWebhooks: boolean;
  enableEdgeCheck: boolean; // Crisis toggle to bypass Edge Functions
  ui?: {
    enablePWAInstallChip?: boolean;
    enableIOSA2HSHelper?: boolean;
  };
  finder?: {
    mode?: 'phash' | 'phash+keypoints';
  };
  a11y?: {
    auditVersion?: string;
  };
  version?: string;
  updated?: string;
}

const DEFAULT_CONFIG: RuntimeConfig = {
  enablePayments: false,
  enableNewAuth: false,
  enableWebhooks: false,
  enableEdgeCheck: false,
  ui: {
    enablePWAInstallChip: true,
    enableIOSA2HSHelper: true,
  },
  finder: {
    mode: 'phash+keypoints',
  },
  a11y: {
    auditVersion: '1.0.0',
  },
};

let cachedConfig: RuntimeConfig = DEFAULT_CONFIG;
let configLoaded = false;
let loadPromise: Promise<RuntimeConfig> | null = null;

/**
 * Load runtime config from server
 * Safe: returns defaults if fetch fails, no crash
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (configLoaded) {
    return cachedConfig;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch('/config/runtime.json', {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        console.warn('[RuntimeConfig] Failed to load, using defaults:', response.status);
        return DEFAULT_CONFIG;
      }

      const config = await response.json();
      
      // Validate config structure
      cachedConfig = {
        enablePayments: Boolean(config.enablePayments),
        enableNewAuth: Boolean(config.enableNewAuth),
        enableWebhooks: Boolean(config.enableWebhooks),
        enableEdgeCheck: Boolean(config.enableEdgeCheck),
        ui: {
          enablePWAInstallChip: config.ui?.enablePWAInstallChip ?? true,
          enableIOSA2HSHelper: config.ui?.enableIOSA2HSHelper ?? true,
        },
        finder: {
          mode: config.finder?.mode ?? 'phash+keypoints',
        },
        a11y: {
          auditVersion: config.a11y?.auditVersion ?? '1.0.0',
        },
        version: config.version,
        updated: config.updated,
      };

      configLoaded = true;
      console.info('[RuntimeConfig] Loaded:', cachedConfig);
      return cachedConfig;
    } catch (error) {
      console.warn('[RuntimeConfig] Load error, using defaults:', error);
      return DEFAULT_CONFIG;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Get current runtime config (synchronous)
 * Returns cached config or defaults if not loaded yet
 */
export function getRuntimeConfig(): RuntimeConfig {
  return cachedConfig;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof RuntimeConfig): boolean {
  if (typeof cachedConfig[feature] !== 'boolean') {
    return false;
  }
  return cachedConfig[feature] as boolean;
}

/**
 * Force reload config from server (for testing/admin)
 */
export async function reloadRuntimeConfig(): Promise<RuntimeConfig> {
  configLoaded = false;
  loadPromise = null;
  return loadRuntimeConfig();
}

/**
 * Get flag state snapshot for telemetry correlation
 */
export function getFlagSnapshot(): Record<string, boolean> {
  return {
    payments: cachedConfig.enablePayments,
    newAuth: cachedConfig.enableNewAuth,
    webhooks: cachedConfig.enableWebhooks,
    edgeCheck: cachedConfig.enableEdgeCheck,
  };
}
