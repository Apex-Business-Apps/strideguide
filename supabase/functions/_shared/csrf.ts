/**
 * CSRF Protection Utilities
 * Double Submit Cookie pattern for Supabase Edge Functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * Generate a cryptographically secure random token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token using Double Submit Cookie pattern
 * Compares token from header with token from cookie
 */
export function validateCsrfToken(req: Request): { valid: boolean; error?: string } {
  // Extract token from header
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    return { valid: false, error: 'Missing CSRF token in header' };
  }

  // Extract token from cookie
  const cookies = req.headers.get('cookie') || '';
  const cookieMatch = cookies.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  const cookieToken = cookieMatch ? cookieMatch[1] : null;

  if (!cookieToken) {
    return { valid: false, error: 'Missing CSRF token in cookie' };
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(headerToken, cookieToken)) {
    return { valid: false, error: 'CSRF token mismatch' };
  }

  return { valid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * CSRF middleware for admin operations
 * Validates CSRF token and user role
 */
export async function requireCsrfAndAdmin(
  req: Request,
  supabaseClient: ReturnType<typeof createClient>
): Promise<{ valid: true; userId: string } | { valid: false; error: string; status: number }> {
  // Validate CSRF token
  const csrfResult = validateCsrfToken(req);
  if (!csrfResult.valid) {
    return {
      valid: false,
      error: csrfResult.error || 'CSRF validation failed',
      status: 403,
    };
  }

  // Validate authentication
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { valid: false, error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return { valid: false, error: 'Invalid authentication', status: 401 };
  }

  // Check if user is admin using the is_admin() function
  const { data: isAdminData, error: adminError } = await supabaseClient
    .rpc('is_admin', { _user_id: user.id });

  if (adminError) {
    console.error('[CSRF] Failed to check admin status:', adminError);
    return { valid: false, error: 'Failed to verify admin role', status: 500 };
  }

  if (!isAdminData) {
    return { valid: false, error: 'Admin access required', status: 403 };
  }

  return { valid: true, userId: user.id };
}

/**
 * Set CSRF cookie in response headers
 */
export function setCsrfCookie(token: string, maxAge: number = 3600): string {
  return `${CSRF_COOKIE_NAME}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}
