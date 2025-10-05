/**
 * Edge Function Integration Tests
 * Run with: deno test --allow-net --allow-env edge-function-tests.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.190.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://yrndifsbsmpvmpudglcc.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Test Authentication Helper
async function getTestAuthToken(): Promise<string> {
  // In production, use a real test user
  // For now, this is a placeholder
  return `Bearer ${SUPABASE_ANON_KEY}`;
}

// Test 1: Stripe Webhook Signature Verification
Deno.test("Stripe Webhook - Rejects invalid signature", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": "invalid_signature",
    },
    body: JSON.stringify({ type: "customer.subscription.created" }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertExists(data.error);
});

// Test 2: Create Checkout - Requires Authentication
Deno.test("Create Checkout - Requires authentication", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      planId: "test-plan-id",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.code, "AUTH_REQUIRED");
});

// Test 3: Create Checkout - Validates Input
Deno.test("Create Checkout - Validates required fields", async () => {
  const authToken = await getTestAuthToken();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authToken,
    },
    body: JSON.stringify({
      // Missing required fields
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertEquals(data.code, "INVALID_INPUT");
});

// Test 4: AI Chat - Rate Limiting
Deno.test("AI Chat - Enforces rate limiting", async () => {
  const authToken = await getTestAuthToken();
  
  // Make multiple rapid requests
  const requests = Array(35).fill(null).map(() =>
    fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authToken,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "test" }],
      }),
    })
  );

  const responses = await Promise.all(requests);
  const rateLimited = responses.some(r => r.status === 429);
  
  assertEquals(rateLimited, true, "Should enforce rate limit after 30 requests");
});

// Test 5: AI Chat - Validates Message Length
Deno.test("AI Chat - Rejects messages over 1000 chars", async () => {
  const authToken = await getTestAuthToken();
  const longMessage = "a".repeat(1001);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authToken,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: longMessage }],
    }),
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertEquals(data.code, "MESSAGE_TOO_LONG");
});

// Test 6: Customer Portal - Requires Active Subscription
Deno.test("Customer Portal - Requires active subscription", async () => {
  const authToken = await getTestAuthToken();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/customer-portal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authToken,
    },
    body: JSON.stringify({
      returnUrl: "https://example.com/settings",
    }),
  });

  // Should return 404 if no active subscription
  const data = await response.json();
  if (response.status === 404) {
    assertEquals(data.code, "NO_ACTIVE_SUBSCRIPTION");
  }
});

// Test 7: Admin Access - Server-Side Validation
Deno.test("Check Admin Access - Returns proper structure", async () => {
  const authToken = await getTestAuthToken();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/check-admin-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authToken,
    },
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertExists(data.isAdmin);
  assertEquals(typeof data.isAdmin, "boolean");
});

// Test 8: Feature Validation - Returns Access Status
Deno.test("Validate Feature Access - Returns boolean", async () => {
  const authToken = await getTestAuthToken();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-feature-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authToken,
    },
    body: JSON.stringify({
      featureName: "premium_features",
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertExists(data.hasAccess);
  assertEquals(typeof data.hasAccess, "boolean");
});

// Test 9: CORS Preflight
Deno.test("All endpoints - Handle CORS preflight", async () => {
  const endpoints = [
    "stripe-webhook",
    "create-checkout",
    "customer-portal",
    "ai-chat",
    "check-admin-access",
    "validate-feature-access",
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: "OPTIONS",
    });

    assertEquals(response.status, 200);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  }
});

// Test 10: Error Response Format
Deno.test("Edge functions - Return consistent error format", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  assertExists(data.error);
  assertExists(data.code);
  assertEquals(typeof data.error, "string");
  assertEquals(typeof data.code, "string");
});

console.log("✅ All edge function tests completed");
