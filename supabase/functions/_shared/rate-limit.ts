/**
 * Rate Limiting Utilities for Edge Functions
 * Implements sliding window rate limiting
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface RateLimitConfig {
  maxAttempts?: number;
  windowSeconds?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxAttempts: number;
  remaining?: number;
  resetAt?: string;
  retryAfterSeconds?: number;
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  AUTH_LOGIN: { maxAttempts: 5, windowSeconds: 300 }, // 5 attempts per 5 minutes
  AUTH_SIGNUP: { maxAttempts: 3, windowSeconds: 3600 }, // 3 attempts per hour
  AUTH_PASSWORD_RESET: { maxAttempts: 3, windowSeconds: 3600 }, // 3 attempts per hour
  AUTH_OTP: { maxAttempts: 5, windowSeconds: 300 }, // 5 attempts per 5 minutes
  API_GENERAL: { maxAttempts: 60, windowSeconds: 60 }, // 60 requests per minute
} as const;

/**
 * Extract identifier from request (IP address or user ID)
 */
export function getIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers (respecting proxy)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return `ip:${cfConnectingIp}`;
  }

  // Fallback to generic identifier
  return 'ip:unknown';
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  supabaseClient: ReturnType<typeof createClient>,
  identifier: string,
  endpoint: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const { maxAttempts = 60, windowSeconds = 60 } = config;

  try {
    const { data, error } = await supabaseClient.rpc('check_rate_limit', {
      _identifier: identifier,
      _endpoint: endpoint,
      _max_attempts: maxAttempts,
      _window_seconds: windowSeconds,
    });

    if (error) {
      console.error('[RateLimit] Database error:', error);
      // On error, allow request (fail open) but log it
      return {
        allowed: true,
        currentCount: 0,
        maxAttempts,
        remaining: maxAttempts,
      };
    }

    return {
      allowed: data.allowed,
      currentCount: data.current_count,
      maxAttempts: data.max_attempts,
      remaining: data.remaining,
      resetAt: data.reset_at,
      retryAfterSeconds: data.retry_after_seconds,
    };
  } catch (err) {
    console.error('[RateLimit] Unexpected error:', err);
    // On error, allow request (fail open)
    return {
      allowed: true,
      currentCount: 0,
      maxAttempts,
      remaining: maxAttempts,
    };
  }
}

/**
 * Middleware to enforce rate limiting
 */
export async function enforceRateLimit(
  req: Request,
  endpoint: string,
  config: RateLimitConfig = {},
  userId?: string
): Promise<Response | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const identifier = getIdentifier(req, userId);
  const result = await checkRateLimit(supabase, identifier, endpoint, config);

  if (!result.allowed) {
    const retryAfter = result.retryAfterSeconds || 60;

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfterSeconds: retryAfter,
        resetAt: result.resetAt,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': result.maxAttempts.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt || '',
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  return null; // null means rate limit passed, continue with request
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.maxAttempts.toString(),
    'X-RateLimit-Remaining': (result.remaining || 0).toString(),
  };

  if (result.resetAt) {
    headers['X-RateLimit-Reset'] = result.resetAt;
  }

  return headers;
}
