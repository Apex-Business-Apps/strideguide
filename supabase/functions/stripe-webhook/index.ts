// @stride/stripe-webhook v2 - Production-hardened with signature verification
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

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Webhook received`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    // Validate environment
    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !stripeWebhookSecret) {
      console.error(`[${requestId}] Missing required environment variables`);
      return new Response(JSON.stringify({ error: "Service misconfigured" }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature) {
      console.error(`[${requestId}] No Stripe signature header found`);
      await logSecurityEvent(supabase, null, "webhook_signature_missing", "critical");
      return new Response("No signature", { status: 401 });
    }

    // CRITICAL: Verify webhook signature to prevent tampering
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
      console.log(`[${requestId}] Signature verified for event ${event.id}, type: ${event.type}`);
    } catch (err: any) {
      console.error(`[${requestId}] Signature verification failed:`, err.message);
      await logSecurityEvent(supabase, null, "webhook_signature_failed", "critical", {
        error: err.message
      });
      return new Response(`Webhook signature verification failed: ${err.message}`, { 
        status: 400 
      });
    }

    // Idempotency check - prevent duplicate event processing
    const { data: existingEvent } = await supabase
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
      
    if (existingEvent) {
      console.log(`[${requestId}] Event ${event.id} already processed, returning 200`);
      return new Response(JSON.stringify({ received: true, status: "duplicate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Route event to appropriate handler
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(supabase, event, requestId);
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await handlePaymentEvent(supabase, event, requestId);
        break;
      case "customer.subscription.trial_will_end":
        await handleTrialEndingSoon(supabase, event, requestId);
        break;
      default:
        console.log(`[${requestId}] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true, event: event.type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(`[${requestId}] Webhook error:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSubscriptionEvent(supabase: any, event: Stripe.Event, requestId: string) {
  const subscription = event.data.object as Stripe.Subscription;
  
  console.log(`[${requestId}] Processing subscription event for ${subscription.id}`);
  
  try {
    // Find user by Stripe customer ID
    const { data: existingSub, error: findError } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer)
      .maybeSingle();
      
    if (findError) {
      console.error(`[${requestId}] Error finding subscription:`, findError);
      throw findError;
    }
    
    if (!existingSub) {
      console.warn(`[${requestId}] No user found for customer ${subscription.customer}`);
      return;
    }
    
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        user_id: existingSub.user_id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      }, {
        onConflict: "stripe_subscription_id"
      });
      
    if (error) {
      console.error(`[${requestId}] Error upserting subscription:`, error);
      throw error;
    }
    
    await logSecurityEvent(supabase, existingSub.user_id, `subscription_${event.type}`, "info", {
      subscription_id: subscription.id,
      status: subscription.status
    });
    
    console.log(`[${requestId}] Subscription ${subscription.id} updated successfully`);
  } catch (error) {
    console.error(`[${requestId}] Failed to handle subscription event:`, error);
    throw error;
  }
}

async function handlePaymentEvent(supabase: any, event: Stripe.Event, requestId: string) {
  const invoice = event.data.object as Stripe.Invoice;
  
  console.log(`[${requestId}] Processing payment event for invoice ${invoice.id}`);
  
  try {
    // Find user by Stripe customer ID
    const { data: userSub, error: findError } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", invoice.customer)
      .maybeSingle();
      
    if (findError) {
      console.error(`[${requestId}] Error finding user:`, findError);
      throw findError;
    }
    
    if (!userSub) {
      console.warn(`[${requestId}] No user found for customer ${invoice.customer}`);
      return;
    }
    
    const { error } = await supabase
      .from("billing_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        user_id: userSub.user_id,
        amount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency || "usd",
        status: event.type === "invoice.payment_succeeded" ? "succeeded" : "failed",
        metadata: { 
          invoice_id: invoice.id,
          invoice_number: invoice.number,
          billing_reason: invoice.billing_reason
        }
      });
      
    if (error) {
      console.error(`[${requestId}] Error recording billing event:`, error);
      throw error;
    }
    
    await logSecurityEvent(supabase, userSub.user_id, `payment_${event.type}`, "info", {
      invoice_id: invoice.id,
      amount: invoice.amount_paid
    });
    
    console.log(`[${requestId}] Payment event recorded successfully`);
  } catch (error) {
    console.error(`[${requestId}] Failed to handle payment event:`, error);
    throw error;
  }
}

async function handleTrialEndingSoon(supabase: any, event: Stripe.Event, requestId: string) {
  const subscription = event.data.object as Stripe.Subscription;
  
  console.log(`[${requestId}] Trial ending soon for subscription ${subscription.id}`);
  
  // Find user and send notification
  const { data: userSub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
    
  if (userSub) {
    await logSecurityEvent(supabase, userSub.user_id, "trial_ending_soon", "info", {
      subscription_id: subscription.id,
      trial_end: subscription.trial_end
    });
  }
}

async function logSecurityEvent(
  supabase: any, 
  userId: string | null, 
  eventType: string, 
  severity: string,
  eventData: any = {}
) {
  try {
    await supabase
      .from("security_audit_log")
      .insert({
        user_id: userId,
        event_type: eventType,
        severity: severity,
        event_data: eventData
      });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}
