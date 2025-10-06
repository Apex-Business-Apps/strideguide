// @stride/create-checkout v2 - Production-hardened with idempotency
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.11.0?target=deno";

import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Create checkout request`);

  try {
    const { planId, isYearly, successUrl, cancelUrl, idempotencyKey } = await req.json();
    
    // Input validation
    if (!planId || !successUrl || !cancelUrl) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters",
        code: "INVALID_INPUT" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "Not authenticated",
        code: "AUTH_REQUIRED" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey) {
      console.error(`[${requestId}] Missing environment variables`);
      return new Response(JSON.stringify({ error: "Service misconfigured" }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn(`[${requestId}] User authentication failed`);
      return new Response(JSON.stringify({ 
        error: "Authentication failed",
        code: "AUTH_FAILED" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const { data: rateLimitCheck } = await supabase
      .rpc("check_rate_limit", {
        _user_id: user.id,
        _endpoint: "create_checkout",
        _max_requests: 10,
        _window_minutes: 10
      });
      
    if (!rateLimitCheck) {
      console.warn(`[${requestId}] Rate limit exceeded for user ${user.id}`);
      return new Response(JSON.stringify({ 
        error: "Too many checkout requests. Please try again later.",
        code: "RATE_LIMITED" 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscription plan (server-side only, not exposed to client)
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();
      
    if (planError || !plan) {
      console.error(`[${requestId}] Plan not found:`, planError);
      return new Response(JSON.stringify({ 
        error: "Plan not found",
        code: "PLAN_NOT_FOUND" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = isYearly ? plan.stripe_yearly_price_id : plan.stripe_price_id;
    
    if (!priceId) {
      console.error(`[${requestId}] No price ID for plan ${planId}`);
      return new Response(JSON.stringify({ 
        error: "Plan price not configured",
        code: "PRICE_NOT_CONFIGURED" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create Stripe customer
    let customerId: string;
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
      
    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
      console.log(`[${requestId}] Using existing customer ${customerId}`);
    } else {
      // Get user email from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();
        
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: { supabase_user_id: user.id }
      });
      customerId = customer.id;
      console.log(`[${requestId}] Created new customer ${customerId}`);
    }

    // Create checkout session with idempotency
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(
      sessionConfig,
      idempotencyKey ? { idempotencyKey: `checkout_${user.id}_${idempotencyKey}` } : undefined
    );

    // Log checkout creation
    await supabase.from("security_audit_log").insert({
      user_id: user.id,
      event_type: "checkout_created",
      severity: "info",
      event_data: {
        session_id: session.id,
        plan_id: planId,
        is_yearly: isYearly
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Checkout session created: ${session.id} (${duration}ms)`);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        "X-Response-Time": `${duration}ms`
      },
    });
    
  } catch (error: any) {
    console.error(`[${requestId}] Error creating checkout:`, error);
    
    // Handle Stripe-specific errors
    if (error.type === "StripeInvalidRequestError") {
      return new Response(JSON.stringify({ 
        error: "Invalid payment request",
        code: "STRIPE_INVALID_REQUEST" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: error.message,
      code: "INTERNAL_ERROR" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
