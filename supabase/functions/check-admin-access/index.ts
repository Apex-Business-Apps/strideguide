import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', isAdmin: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', isAdmin: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side admin check using security definer function
    const { data: isAdminData, error: adminError } = await supabase
      .rpc('is_admin', { _user_id: user.id });

    if (adminError) {
      console.error('Admin check error:', adminError);
      
      // Log security event
      await supabase.from('security_audit_log').insert({
        user_id: user.id,
        event_type: 'admin_check_failed',
        severity: 'warning',
        event_data: { error: adminError.message },
      });

      return new Response(
        JSON.stringify({ error: 'Admin check failed', isAdmin: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log admin access attempt
    await supabase.from('security_audit_log').insert({
      user_id: user.id,
      event_type: 'admin_access_check',
      severity: isAdminData ? 'info' : 'warning',
      event_data: { 
        is_admin: isAdminData,
        timestamp: new Date().toISOString()
      },
    });

    return new Response(
      JSON.stringify({ 
        isAdmin: isAdminData === true,
        userId: user.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        isAdmin: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
