/**
 * CSRF Token Generator Endpoint
 * Generates and returns a CSRF token with cookie
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';
import { generateCsrfToken, setCsrfCookie } from '../_shared/csrf.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const origin = req.headers.get('origin');
    const headers = getCorsHeaders(origin);

    // Validate authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate CSRF token
    const token = generateCsrfToken();

    // Set cookie and return token
    return new Response(
      JSON.stringify({ token }),
      {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Set-Cookie': setCsrfCookie(token, 3600), // 1 hour
        },
      }
    );
  } catch (error) {
    console.error('[csrf-token] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
