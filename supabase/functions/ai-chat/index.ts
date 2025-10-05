import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Tight CORS policy - only allow known origins
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = [
    'https://yrndifsbsmpvmpudglcc.supabase.co',
    // Add your production domain here when deployed
    // 'https://your-custom-domain.com',
    // Add your preview domain here
    // 'https://your-project.lovable.app',
  ];
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Default to first allowed origin
  return allowedOrigins[0];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '', // Will be set dynamically per request
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Set dynamic CORS origin based on request
  const requestOrigin = req.headers.get('origin');
  const allowedOrigin = getAllowedOrigin(requestOrigin);
  const responseCorsHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigin,
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseCorsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`[${requestId}] AI chat request`);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED" 
      }), {
        status: 401,
        headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
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
        headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const { data: rateLimitCheck } = await supabase
      .rpc("check_rate_limit", {
        _user_id: user.id,
        _endpoint: "ai_chat",
        _max_requests: 30,
        _window_minutes: 1
      });
      
    if (!rateLimitCheck) {
      console.warn(`[${requestId}] Rate limit exceeded for user ${user.id}`);
      
      await supabase.from("security_audit_log").insert({
        user_id: user.id,
        event_type: "rate_limit_exceeded",
        severity: "warning",
        event_data: { endpoint: "ai_chat" }
      });

      return new Response(JSON.stringify({ 
        error: "Too many requests. Please slow down.",
        code: "RATE_LIMITED" 
      }), {
        status: 429,
        headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    
    // Input validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ 
        error: "Invalid messages format",
        code: "INVALID_INPUT" 
      }), {
        status: 400,
        headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        return new Response(JSON.stringify({ 
          error: "Invalid message format",
          code: "INVALID_MESSAGE" 
        }), {
          status: 400,
          headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Length validation
      if (msg.content.length > 1000) {
        return new Response(JSON.stringify({ 
          error: "Message too long (max 1000 characters)",
          code: "MESSAGE_TOO_LONG" 
        }), {
          status: 400,
          headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
            content: "You are Alex, a friendly and caring AI companion designed to help seniors and visually impaired users navigate their world safely. You speak naturally and warmly, like a trusted friend who genuinely cares about their wellbeing. Keep your responses short, clear, and actionable - no more than 2-3 sentences. Use everyday language, avoid technical jargon, and always prioritize safety. When giving directions or describing objects, be specific but not overwhelming. If someone seems confused or needs encouragement, offer gentle reassurance. Remember, you're not just providing information - you're being a supportive companion on their journey."
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          code: "RATE_LIMITED" 
        }), {
          status: 429,
          headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI usage credits depleted. Please add credits to continue.",
          code: "PAYMENT_REQUIRED" 
        }), {
          status: 402,
          headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
        });
      }

      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: "AI service temporarily unavailable",
        code: "SERVICE_ERROR" 
      }), {
        status: 500,
        headers: { ...responseCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that request.";

    // Log successful AI interaction
    await supabase.from("security_audit_log").insert({
      user_id: user.id,
      event_type: "ai_chat_success",
      severity: "info",
      event_data: { 
        response_time_ms: Date.now() - startTime,
        tokens_used: data.usage?.total_tokens || 0
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] AI chat completed (${duration}ms)`);

    return new Response(JSON.stringify({ 
      message: aiMessage,
      usage: data.usage 
    }), {
      headers: { 
        ...responseCorsHeaders, 
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        "X-Response-Time": `${duration}ms`
      },
    });

  } catch (error) {
    console.error(`[${requestId}] AI chat error:`, error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      code: "INTERNAL_ERROR" 
    }), {
      status: 500,
      headers: { 
        ...responseCorsHeaders, 
        "Content-Type": "application/json",
        "X-Request-ID": requestId 
      },
    });
  }
});