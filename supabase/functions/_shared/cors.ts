// Centralized CORS configuration for all edge functions
// This ensures consistent security policy across all endpoints

export const ALLOWED_ORIGINS = [
  'https://yrndifsbsmpvmpudglcc.supabase.co',
  // Add your production domain when deployed:
  // 'https://your-custom-domain.com',
  // Add your preview/staging domain:
  // 'https://your-project.lovable.app',
  // For local development (remove in production):
  // 'http://localhost:8080',
];

export function getAllowedOrigin(requestOrigin: string | null): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Default to first allowed origin (Supabase project)
  return ALLOWED_ORIGINS[0];
}

export function getCorsHeaders(requestOrigin: string | null) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}
