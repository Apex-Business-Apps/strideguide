// Centralized CORS configuration for all edge functions
// This ensures consistent security policy across all endpoints

export const ALLOWED_ORIGINS = [
  'https://yrndifsbsmpvmpudglcc.supabase.co',
  'https://strideguide.cam',
  'https://www.strideguide.cam',
  'https://strideguide.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
];

export function isLovablePreview(origin: string): boolean {
  try {
    const url = new URL(origin);
    return /\.lovable\.app$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function getAllowedOrigin(requestOrigin: string | null): string {
  if (requestOrigin) {
    if (ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
    if (isLovablePreview(requestOrigin)) return requestOrigin;
  }
  
  // Default to first allowed origin (Supabase project)
  return ALLOWED_ORIGINS[0];
}

export function getCorsHeaders(requestOrigin: string | null) {
  const allowed = getAllowedOrigin(requestOrigin);
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'Origin',
  };
}
