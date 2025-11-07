/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Blocking requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Number of failures before opening circuit
  successThreshold?: number; // Number of successes to close circuit from half-open
  timeout?: number; // Time in ms before attempting to half-open
  requestTimeout?: number; // Timeout for individual requests in ms
  name?: string; // Circuit breaker name for logging
}

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  nextAttempt: number; // Timestamp when half-open is allowed
  totalRequests: number;
  totalFailures: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private totalRequests: number = 0;
  private totalFailures: number = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly requestTimeout: number;
  private readonly name: string;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold || 5;
    this.successThreshold = config.successThreshold || 2;
    this.timeout = config.timeout || 60000; // 1 minute
    this.requestTimeout = config.requestTimeout || 5000; // 5 seconds
    this.name = config.name || 'UnnamedCircuit';
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(
          `Circuit breaker [${this.name}] is OPEN. Service unavailable. Retry after ${new Date(this.nextAttempt).toISOString()}`
        );
        (error as any).circuitState = this.state;
        throw error;
      }

      // Transition to half-open to test service
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN state`);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn, this.requestTimeout);

      // Handle success
      this.onSuccess();
      return result;
    } catch (error) {
      // Handle failure
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        // Close circuit - service recovered
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log(`[CircuitBreaker:${this.name}] Circuit CLOSED - service recovered`);
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failureCount++;
    this.totalFailures++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during test - reopen circuit
      this.trip();
    } else if (this.failureCount >= this.failureThreshold) {
      // Threshold exceeded - open circuit
      this.trip();
    }
  }

  /**
   * Open the circuit (block requests)
   */
  private trip(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.timeout;

    console.warn(
      `[CircuitBreaker:${this.name}] Circuit OPENED due to ${this.failureCount} failures. ` +
      `Next attempt at ${new Date(this.nextAttempt).toISOString()}`
    );
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    console.log(`[CircuitBreaker:${this.name}] Circuit manually reset`);
  }

  /**
   * Get circuit health metrics
   */
  getMetrics() {
    const successRate =
      this.totalRequests > 0
        ? ((this.totalRequests - this.totalFailures) / this.totalRequests) * 100
        : 100;

    return {
      name: this.name,
      state: this.state,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      successRate: successRate.toFixed(2) + '%',
      currentFailureCount: this.failureCount,
      isHealthy: this.state === CircuitState.CLOSED && successRate > 95,
    };
  }
}

/**
 * Circuit Breaker Registry - Singleton pattern
 * Manages circuit breakers for different services
 */
class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create circuit breaker for a service
   */
  getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ ...config, name }));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics() {
    const metrics: any[] = [];
    this.breakers.forEach(breaker => {
      metrics.push(breaker.getMetrics());
    });
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

// Export singleton instance
export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();

/**
 * Convenience function to execute with circuit breaker
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  config?: CircuitBreakerConfig
): Promise<T> {
  const breaker = circuitBreakerRegistry.getBreaker(serviceName, config);
  return breaker.execute(fn);
}
