import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`[${requestId}] Vision stream request`);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Service misconfigured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ 
        error: "Authentication failed",
        code: "AUTH_FAILED" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting - vision is more expensive
    const { data: rateLimitCheck } = await supabase
      .rpc("check_rate_limit", {
        _user_id: user.id,
        _endpoint: "vision_stream",
        _max_requests: 20,
        _window_minutes: 1
      });
      
    if (!rateLimitCheck) {
      console.warn(`[${requestId}] Rate limit exceeded for user ${user.id}`);
      
      await supabase.from("security_audit_log").insert({
        user_id: user.id,
        event_type: "rate_limit_exceeded",
        severity: "warning",
        event_data: { endpoint: "vision_stream" }
      });

      return new Response(JSON.stringify({ 
        error: "Too many requests. Please slow down.",
        code: "RATE_LIMITED" 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageData, mode } = await req.json();
    
    // Input validation
    if (!imageData || typeof imageData !== 'string') {
      return new Response(JSON.stringify({ 
        error: "Invalid image data",
        code: "INVALID_INPUT" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate base64 image
    if (!imageData.startsWith('data:image/')) {
      return new Response(JSON.stringify({ 
        error: "Image must be base64 encoded with data URL",
        code: "INVALID_IMAGE_FORMAT" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Determine prompt based on mode
    let prompt = "";
    switch (mode) {
      case "hazard":
        prompt = "Analyze this image for potential hazards and obstacles. Focus on: stairs, curbs, uneven surfaces, ice/snow, obstacles in path, low-hanging objects, narrow passages. List ONLY the hazards you see, be brief and urgent. If no hazards, say 'Clear path ahead.'";
        break;
      case "navigation":
        prompt = "Describe the navigation path ahead. What direction is clear? Are there turns, doors, or landmarks? Keep it brief (2-3 sentences max) and actionable.";
        break;
      case "scene":
        prompt = "Describe the scene for a visually impaired person. What's around them? Key objects, people, overall environment. Brief and clear (2-3 sentences).";
        break;
      case "item":
        prompt = "Look for common household items in this image. List what you see clearly, especially items someone might be looking for (keys, phone, glasses, wallet, remote, etc.).";
        break;
      default:
        prompt = "Describe what you see in this image briefly and clearly for someone who cannot see it.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a vision assistant for StrideGuide, helping seniors and visually impaired users navigate safely. Be concise, clear, and prioritize safety. Use everyday language."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageData } }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          code: "RATE_LIMITED" 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI usage credits depleted. Please add credits to continue.",
          code: "PAYMENT_REQUIRED" 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: "AI service temporarily unavailable",
        code: "SERVICE_ERROR" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || "Unable to analyze image.";

    // Log successful vision analysis
    await supabase.from("security_audit_log").insert({
      user_id: user.id,
      event_type: "vision_analysis_success",
      severity: "info",
      event_data: { 
        response_time_ms: Date.now() - startTime,
        tokens_used: data.usage?.total_tokens || 0,
        mode: mode || "unknown"
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Vision analysis completed (${duration}ms)`);

    return new Response(JSON.stringify({ 
      description,
      mode,
      usage: data.usage 
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        "X-Response-Time": `${duration}ms`
      },
    });

  } catch (error) {
    console.error(`[${requestId}] Vision stream error:`, error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      code: "INTERNAL_ERROR" 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Request-ID": requestId 
      },
    });
  }
});
