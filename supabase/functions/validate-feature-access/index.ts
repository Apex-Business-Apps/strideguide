// @stride/validate-feature-access v2 - Production-hardened authorization
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

// Rate limiting configuration
const RATE_LIMIT_CONFIG: Record<string, { maxRequests: number; windowMinutes: number }> = {
  "premium_features": { maxRequests: 100, windowMinutes: 1 },
  "ai_chat": { maxRequests: 50, windowMinutes: 1 },
  "default": { maxRequests: 200, windowMinutes: 1 }
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Feature access validation request`);

  try {
    const { featureName } = await req.json();
    
    if (!featureName || typeof featureName !== "string") {
      return new Response(JSON.stringify({ 
        error: "Invalid feature name",
        code: "INVALID_INPUT" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn(`[${requestId}] No authorization header`);
      return new Response(JSON.stringify({ 
        hasAccess: false,
        reason: "Not authenticated",
        code: "AUTH_REQUIRED" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`[${requestId}] Missing environment variables`);
      return new Response(JSON.stringify({ error: "Service misconfigured" }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn(`[${requestId}] User authentication failed:`, userError?.message);
      return new Response(JSON.stringify({ 
        hasAccess: false,
        reason: "Authentication failed",
        code: "AUTH_FAILED" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const rateLimitConfig = RATE_LIMIT_CONFIG[featureName] || RATE_LIMIT_CONFIG.default;
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc("check_rate_limit", {
        _user_id: user.id,
        _endpoint: `feature_${featureName}`,
        _max_requests: rateLimitConfig.maxRequests,
        _window_minutes: rateLimitConfig.windowMinutes
      });
      
    if (rateLimitError) {
      console.error(`[${requestId}] Rate limit check error:`, rateLimitError);
    } else if (!rateLimitCheck) {
      console.warn(`[${requestId}] Rate limit exceeded for user ${user.id}, feature ${featureName}`);
      
      // Log rate limit violation (deduplicated per user/endpoint/minute)
      await supabase.rpc('log_audit_event_deduplicated', {
        _user_id: user.id,
        _event_type: 'rate_limit_exceeded',
        _severity: 'warn',
        _event_data: { 
          endpoint: `feature_${featureName}`,
          feature: featureName,
          limit: rateLimitConfig.maxRequests,
          window: rateLimitConfig.windowMinutes
        }
      });
      
      return new Response(JSON.stringify({ 
        hasAccess: false,
        reason: "Rate limit exceeded",
        code: "RATE_LIMITED",
        retryAfter: rateLimitConfig.windowMinutes * 60
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitConfig.windowMinutes * 60)
        },
      });
    }

    // Check if user is admin first - admins have access to all features
    const { data: isAdminData } = await supabase
      .rpc('is_admin', { _user_id: user.id });

    let hasAccess = false;

    if (isAdminData === true) {
      // Admins bypass subscription checks
      hasAccess = true;
      console.log(`[${requestId}] Admin user ${user.id} granted access to ${featureName}`);
    } else {
      // Check feature access using database function
      const { data: hasFeatureAccess, error: accessError } = await supabase
        .rpc("user_has_feature_access", {
          user_uuid: user.id,
          feature_name: featureName
        });
        
      if (accessError) {
        console.error(`[${requestId}] Feature access check error:`, accessError);
        return new Response(JSON.stringify({ 
          error: "Access check failed",
          code: "CHECK_FAILED" 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      hasAccess = hasFeatureAccess || false;
    }

    // Get user's plan level for additional context
    const { data: planLevel } = await supabase
      .rpc("get_active_plan_level", { _user_id: user.id });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] User ${user.id} access to ${featureName}: ${hasAccess}, plan level: ${planLevel}, is_admin: ${isAdminData} (${duration}ms)`);

    // Log access attempt for premium features
    if (featureName.includes("premium") || featureName.includes("enterprise")) {
      await supabase.from("security_audit_log").insert({
        user_id: user.id,
        event_type: hasAccess ? "feature_access_granted" : "feature_access_denied",
        severity: "info",
        event_data: { 
          feature: featureName,
          plan_level: planLevel,
          is_admin: isAdminData === true,
          response_time_ms: duration
        }
      });
    }

    return new Response(JSON.stringify({ 
      hasAccess,
      planLevel: planLevel || 0,
      userId: user.id,
      isAdmin: isAdminData === true
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        "X-Response-Time": `${duration}ms`
      },
    });

  } catch (error: any) {
    console.error(`[${requestId}] Validation error:`, error);
    return new Response(JSON.stringify({ 
      error: error.message,
      code: "INTERNAL_ERROR" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
