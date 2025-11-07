/**
 * API Retry Logic with Exponential Backoff
 * Handles transient failures for external API calls (Stripe, OpenAI, Supabase)
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const calculateDelay = (
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number => {
  const delay = initialDelay * Math.pow(multiplier, attempt);
  const jitter = Math.random() * 0.1 * delay; // Add 10% jitter to prevent thundering herd
  return Math.min(delay + jitter, maxDelay);
};

/**
 * Determines if an error is retryable
 */
const isRetryableError = (error: unknown, retryableStatuses: number[]): boolean => {
  if (!error) return false;

  // Check for network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true; // Network failure
  }

  // Check for Response with retryable status
  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: number; response?: { status?: number } };
    const status = err.status || err.response?.status;
    if (status && retryableStatuses.includes(status)) {
      return true;
    }
  }

  return false;
};

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetch('https://api.stripe.com/v1/checkout/sessions', { ... }),
 *   { maxRetries: 3 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableStatuses)) {
        throw error; // Non-retryable error, throw immediately
      }

      // Calculate and apply backoff delay
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      console.warn(
        `[ApiRetry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed, retrying in ${Math.round(delay)}ms...`,
        error
      );

      await sleep(delay);
    }
  }

  // All retries exhausted
  console.error(`[ApiRetry] All ${opts.maxRetries + 1} attempts failed`, lastError);
  throw lastError;
}

/**
 * Wrapper for fetch with automatic retry
 *
 * @example
 * const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer ...' },
 *   body: JSON.stringify({ model: 'gpt-4', messages: [...] })
 * });
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);

    // Check if response status is retryable
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (!response.ok && opts.retryableStatuses.includes(response.status)) {
      throw {
        status: response.status,
        statusText: response.statusText,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return response;
  }, options);
}

/**
 * Supabase edge function invocation with retry
 *
 * @example
 * const { data, error } = await invokeWithRetry(
 *   supabase,
 *   'create-checkout',
 *   { planId: 'premium', isYearly: true }
 * );
 */
export async function invokeWithRetry<T = unknown>(
  supabase: any,
  functionName: string,
  body?: Record<string, unknown>,
  options?: RetryOptions
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await retryWithBackoff(async () => {
      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        // Check if error is retryable (network or 5xx errors)
        if (error.message?.includes('fetch') || error.status >= 500) {
          throw { status: error.status || 503, message: error.message };
        }
        throw error; // Non-retryable, will exit retry loop
      }

      return data;
    }, options);

    return { data: result as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
