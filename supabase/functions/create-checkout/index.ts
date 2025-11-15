import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, ALLOWED_ORIGINS } from "../_shared/cors.ts";
import { sanitizeRedirectUrl } from "../_shared/url-validator.ts";

Deno.serve(async (req: Request) => {
  // SECURITY FIX: Use proper CORS headers instead of wildcard
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!stripeKey) {
      console.error("Missing STRIPE_SECRET_KEY");
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { planId, isYearly, successUrl, cancelUrl, idempotencyKey } = await req.json();

    if (!planId) {
      return new Response(JSON.stringify({ error: "Missing planId" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error("Plan fetch error:", planError);
      return new Response(JSON.stringify({ error: "Plan not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const priceId = isYearly ? plan.stripe_yearly_price_id : plan.stripe_price_id;
    
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Price ID not configured" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const stripe = new Stripe(stripeKey, { 
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient() 
    });

    // SECURITY FIX: Validate redirect URLs to prevent open redirect attacks
    // Use configured site URL or first allowed origin as fallback (never user input)
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") ?? ALLOWED_ORIGINS[0];

    // Sanitize success and cancel URLs
    const successPath = successUrl ? sanitizeRedirectUrl(successUrl, '/app?checkout=success') : '/app?checkout=success';
    const cancelPath = cancelUrl ? sanitizeRedirectUrl(cancelUrl, '/app?checkout=cancel') : '/app?checkout=cancel';

    const success_url = successPath.startsWith('http') ? successPath : `${siteUrl}${successPath}`;
    const cancel_url = cancelPath.startsWith('http') ? cancelPath : `${siteUrl}${cancelPath}`;

    console.log("Creating checkout session", { userId: user.id, planId, priceId, isYearly });

    if (idempotencyKey) {
      const { data: existingLog } = await supabase
        .from('stripe_idempotency_log')
        .select('stripe_object_id')
        .eq('idempotency_key', idempotencyKey)
        .eq('operation_type', 'checkout_session')
        .single();

      if (existingLog?.stripe_object_id) {
        const existingSession = await stripe.checkout.sessions.retrieve(existingLog.stripe_object_id);
        console.log("Returning existing checkout session", { sessionId: existingSession.id });
        
        return new Response(JSON.stringify({ url: existingSession.url, sessionId: existingSession.id }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      customer_email: user.email,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        is_yearly: isYearly?.toString() || 'false',
      },
    });

    if (idempotencyKey) {
      await supabase.from('stripe_idempotency_log').insert({
        idempotency_key: idempotencyKey,
        stripe_object_id: session.id,
        operation_type: 'checkout_session',
        user_id: user.id,
      });
    }

    await supabase.from('security_audit_log').insert({
      user_id: user.id,
      event_type: 'checkout_created',
      severity: 'info',
      event_data: { session_id: session.id, plan_id: planId, is_yearly: isYearly },
    });

    console.log("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in create-checkout:", error);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
