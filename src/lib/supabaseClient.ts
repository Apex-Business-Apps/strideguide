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
        'apikey': SUPABASE_ANON_KEY || ''
      }
    });
    if (!r.ok) throw new Error(`Health ${r.status}: ${await r.text()}`);
    return true;
  } catch (e: any) {
    console.error('[Health] Supabase unreachable:', e.message);
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
    } catch (e: any) {
      if (i === max - 1) {
        console.error(`[Auth] ${label} failed after ${max} attempts:`, e);
        throw e;
      }
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error(`[auth] ${label} exhausted retries`);
}

// Re-export for backwards compatibility
export { supabase, authRedirectTo };
