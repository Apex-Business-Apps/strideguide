/**
 * Client-Side Rate Limiter
 * Prevents abuse of expensive operations with throttle/debounce strategies
 */

import { logger } from './ProductionLogger';

interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
  strategy: 'throttle' | 'debounce' | 'sliding-window';
}

class RateLimiter {
  private callTimestamps: Map<string, number[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private throttleLastCall: Map<string, number> = new Map();

  /**
   * Check if operation is rate limited
   */
  isRateLimited(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();

    switch (config.strategy) {
      case 'throttle':
        return this.checkThrottle(key, now, config.windowMs);
      
      case 'sliding-window':
        return this.checkSlidingWindow(key, now, config.maxCalls, config.windowMs);
      
      default:
        return false;
    }
  }

  /**
   * Throttle: Allow at most one call per windowMs
   */
  private checkThrottle(key: string, now: number, windowMs: number): boolean {
    const lastCall = this.throttleLastCall.get(key) || 0;
    
    if (now - lastCall < windowMs) {
      logger.debug(`Rate limited (throttle): ${key}`, { 
        remainingMs: windowMs - (now - lastCall) 
      });
      return true;
    }

    this.throttleLastCall.set(key, now);
    return false;
  }

  /**
   * Sliding window: Allow maxCalls within windowMs
   */
  private checkSlidingWindow(
    key: string,
    now: number,
    maxCalls: number,
    windowMs: number
  ): boolean {
    const timestamps = this.callTimestamps.get(key) || [];
    
    // Remove expired timestamps
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    if (validTimestamps.length >= maxCalls) {
      logger.debug(`Rate limited (sliding-window): ${key}`, {
        current: validTimestamps.length,
        max: maxCalls,
      });
      return true;
    }

    validTimestamps.push(now);
    this.callTimestamps.set(key, validTimestamps);
    return false;
  }

  /**
   * Debounce: Delay execution until windowMs of inactivity
   */
  debounce<T extends (...args: unknown[]) => unknown>(
    key: string,
    fn: T,
    windowMs: number
  ): T {
    return ((...args: unknown[]) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(key);
        fn(...args);
      }, windowMs);

      this.debounceTimers.set(key, timer);
    }) as T;
  }

  /**
   * Throttle: Execute immediately, then prevent calls for windowMs
   */
  throttle<T extends (...args: unknown[]) => unknown>(
    key: string,
    fn: T,
    windowMs: number
  ): T {
    return ((...args: unknown[]) => {
      if (this.isRateLimited(key, { maxCalls: 1, windowMs, strategy: 'throttle' })) {
        logger.debug(`Throttled call ignored: ${key}`);
        return;
      }
      fn(...args);
    }) as T;
  }

  /**
   * Clear all rate limit state for a key
   */
  reset(key: string): void {
    this.callTimestamps.delete(key);
    this.throttleLastCall.delete(key);
    
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
  }

  /**
   * Clear all rate limit state
   */
  resetAll(): void {
    this.callTimestamps.clear();
    this.throttleLastCall.clear();
    
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Decorator for rate-limited functions
 */
export function rateLimit(config: RateLimitConfig) {
  return function <_T extends (...args: unknown[]) => unknown>(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const key = `${target?.constructor?.name || 'unknown'}.${propertyKey}`;

    descriptor.value = function (...args: unknown[]) {
      if (rateLimiter.isRateLimited(key, config)) {
        logger.warn(`Rate limit exceeded for ${key}`);
        return;
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Performance budgets for rate limiting
 */
export const RATE_LIMITS = {
  VISION_ANALYSIS: { maxCalls: 10, windowMs: 60000, strategy: 'sliding-window' as const },
  AI_CHAT: { maxCalls: 20, windowMs: 60000, strategy: 'sliding-window' as const },
  SOS_TRIGGER: { maxCalls: 1, windowMs: 30000, strategy: 'throttle' as const },
  TTS_SPEAK: { maxCalls: 30, windowMs: 60000, strategy: 'sliding-window' as const },
  CAMERA_CAPTURE: { maxCalls: 60, windowMs: 60000, strategy: 'sliding-window' as const },
} as const;

export default rateLimiter;
