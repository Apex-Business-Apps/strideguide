// DEPRECATED: This wrapper is being phased out. Use @/integrations/supabase/client directly.
// Kept for backwards compatibility during migration.

import { supabase, authRedirectTo } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://yrndifsbsmpvmpudglcc.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Lightweight health check with proper headers
export async function assertSupabaseReachable(timeoutMs = 5000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL('/auth/v1/health', SUPABASE_URL);
    // CRITICAL: Health endpoint requires apikey header
    const r = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'apikey': SUPABASE_ANON_KEY || '',
        'Accept': 'application/json'
      }
    });

    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(`HTTP error! status: ${r.status}, message: ${errorText}`);
    }

    const contentType = r.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.warn('[Health] Response is not JSON. Content-Type:', contentType);
      // Health endpoint might return plain text, so we'll be lenient
    }

    return true;
  } catch (_e: unknown) {
    const _error = _e as Error;
    console.error('[Health] Supabase unreachable:', _error.message);
    return false;
  } finally {
    clearTimeout(t);
  }
}

// Retry wrapper for sign-in/up actions with exponential backoff
export async function withAuthBackoff<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const max = 4;
  let delay = 200;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (_e: unknown) {
    const _error = _e as Error;
      if (i === max - 1) {
        console.error(`[Auth] ${label} failed after ${max} attempts:`, _e);
        throw _e;
      }
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error(`[auth] ${label} exhausted retries`);
}

// Re-export for backwards compatibility
export { supabase, authRedirectTo };
