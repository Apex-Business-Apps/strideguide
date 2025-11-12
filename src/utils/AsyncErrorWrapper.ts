/**
 * Async Error Wrapper - Standardized error handling for async operations
 * Ensures all async functions have proper try-catch and logging
 */

import { logger } from './ProductionLogger';

export interface AsyncWrapperOptions {
  operation: string;
  context?: Record<string, unknown>;
  fallbackValue?: unknown;
  shouldRethrow?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Wrap async function with error handling
 */
export async function wrapAsync<T>(
  fn: () => Promise<T>,
  options: AsyncWrapperOptions
): Promise<T | undefined> {
  const correlationId = `async_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    return await fn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(`Async operation failed: ${options.operation}`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      correlationId,
      ...options.context,
    });

    // Call custom error handler
    if (options.onError) {
      try {
        options.onError(error as Error);
      } catch (handlerError) {
        logger.error('Error handler threw exception', { handlerError });
      }
    }

    // Rethrow if specified
    if (options.shouldRethrow) {
      throw error;
    }

    // Return fallback value
    return options.fallbackValue as T | undefined;
  }
}

/**
 * Create a wrapped version of an async function
 */
export function createAsyncWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  baseOptions: Omit<AsyncWrapperOptions, 'operation'>
): T {
  return (async (...args: Parameters<T>) => {
    return wrapAsync(
      () => fn(...args),
      {
        operation: fn.name || 'anonymous',
        ...baseOptions,
      }
    );
  }) as T;
}

/**
 * Retry wrapper for async operations
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: AsyncWrapperOptions & {
    maxRetries?: number;
    retryDelayMs?: number;
    backoffMultiplier?: number;
  }
): Promise<T | undefined> {
  const maxRetries = options.maxRetries || 3;
  const retryDelayMs = options.retryDelayMs || 1000;
  const backoffMultiplier = options.backoffMultiplier || 2;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break; // Exit loop on last attempt
      }

      const delay = retryDelayMs * Math.pow(backoffMultiplier, attempt);
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} for ${options.operation}`, {
        delay,
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  logger.error(`All ${maxRetries} retry attempts failed for ${options.operation}`, {
    error: lastError?.message,
  });

  if (options.shouldRethrow && lastError) {
    throw lastError;
  }

  return options.fallbackValue as T | undefined;
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        const error = new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`);
        logger.error('Async operation timeout', { operation, timeoutMs });
        reject(error);
      }, timeoutMs)
    ),
  ]);
}

/**
 * Decorator for async error handling
 */
export function asyncErrorHandler(options: Omit<AsyncWrapperOptions, 'operation'>) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return wrapAsync(
        () => originalMethod.apply(this, args),
        {
          operation: `${target?.constructor?.name || 'unknown'}.${propertyKey}`,
          ...options,
        }
      );
    };

    return descriptor;
  };
}

export default wrapAsync;
