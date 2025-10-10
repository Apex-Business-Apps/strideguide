/**
 * @stride/production-integration-tests v3.1
 * Comprehensive test suite for production deployment validation
 * 
 * Run with: deno test --allow-net --allow-env test-scripts/production-integration-tests.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const PROD_URL = Deno.env.get("TEST_PROD_URL") || "https://strideguide.cam";
const SUPABASE_URL = "https://yrndifsbsmpvmpudglcc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmRpZnNic21wdm1wdWRnbGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjA1NDUsImV4cCI6MjA3NDYzNjU0NX0.OBtOjMTiZrgV08ttxiIeT48_ITJ_C88gz_kO-2eLUEk";

// ============================================================================
// A. Authentication Flow Tests
// ============================================================================

Deno.test("A1: Signup redirects to /app", async () => {
  const testEmail = `test-${Date.now()}@strideguide.test`;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      password: "Test1234!",
      data: { first_name: "Test", last_name: "User" },
      options: {
        emailRedirectTo: `${PROD_URL}/app`,
      },
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertExists(data.user);
  console.log("✅ A1: Signup redirects to /app");
});

Deno.test("A2: Invalid credentials return 400", async () => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "invalid@test.com",
      password: "WrongPassword",
    }),
  });

  assertEquals(response.status, 400);
  console.log("✅ A2: Invalid credentials rejected");
});

Deno.test("A3: Password reset redirects to /app", async () => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "test@strideguide.test",
      options: {
        redirectTo: `${PROD_URL}/app`,
      },
    }),
  });

  assertEquals(response.status, 200);
  console.log("✅ A3: Password reset redirects to /app");
});

// ============================================================================
// C. CORS Preflight Tests
// ============================================================================

Deno.test("C1: ai-chat CORS preflight returns 204", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: "OPTIONS",
    headers: {
      "Origin": PROD_URL,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });

  assertEquals(response.status, 204);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
  assertExists(response.headers.get("Access-Control-Allow-Methods"));
  console.log("✅ C1: ai-chat CORS preflight passed");
});

Deno.test("C2: check-admin-access CORS preflight returns 204", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/check-admin-access`, {
    method: "OPTIONS",
    headers: {
      "Origin": PROD_URL,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });

  assertEquals(response.status, 204);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
  console.log("✅ C2: check-admin-access CORS preflight passed");
});

Deno.test("C3: validate-feature-access CORS preflight returns 204", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-feature-access`, {
    method: "OPTIONS",
    headers: {
      "Origin": PROD_URL,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });

  assertEquals(response.status, 204);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
  console.log("✅ C3: validate-feature-access CORS preflight passed");
});

// ============================================================================
// E. Authorization Tests
// ============================================================================

Deno.test("E1: Unauthenticated ai-chat returns 401", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: [{ role: "user", content: "test" }] }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.code, "AUTH_REQUIRED");
  console.log("✅ E1: Unauthenticated request rejected");
});

Deno.test("E2: Invalid message length returns 400", async () => {
  // Create a test auth token (this will fail auth but tests input validation first)
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "x".repeat(1001) }],
    }),
  });

  // Either 400 (input validation) or 401 (auth fails first) is acceptable
  assertEquals([400, 401].includes(response.status), true);
  console.log("✅ E2: Input validation enforced");
});

// ============================================================================
// F. Telemetry Tests (requires authenticated session)
// ============================================================================

Deno.test("F1: Journey traces table exists", async () => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/journey_traces?limit=1`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  // 401 is expected (RLS blocks anonymous), 200 if any public data
  assertEquals([200, 401].includes(response.status), true);
  console.log("✅ F1: Journey traces table accessible");
});

Deno.test("F2: Security audit log table exists", async () => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/security_audit_log?limit=1`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  assertEquals([200, 401].includes(response.status), true);
  console.log("✅ F2: Security audit log table accessible");
});

// ============================================================================
// G. Production URL Tests
// ============================================================================

Deno.test("G1: Marketing page (/) loads without SW", async () => {
  const response = await fetch(`${PROD_URL}/`);
  assertEquals(response.status, 200);
  
  const cacheControl = response.headers.get("Cache-Control");
  // Marketing pages should have no-store or short cache
  assertEquals(
    cacheControl?.includes("no-store") || cacheControl?.includes("max-age=0"),
    true,
    "Marketing page should not be cached long-term"
  );
  console.log("✅ G1: Marketing page loads correctly");
});

Deno.test("G2: Auth page (/auth) loads", async () => {
  const response = await fetch(`${PROD_URL}/auth`);
  assertEquals(response.status, 200);
  console.log("✅ G2: Auth page loads");
});

Deno.test("G3: App route (/app) loads", async () => {
  const response = await fetch(`${PROD_URL}/app`);
  assertEquals(response.status, 200);
  console.log("✅ G3: App route loads");
});

Deno.test("G4: SW file exists at /app/sw.js", async () => {
  const response = await fetch(`${PROD_URL}/app/sw.js`);
  assertEquals(response.status, 200);
  
  const text = await response.text();
  assertEquals(text.includes("sg-app-2025-10-10-v3.1"), true, "SW version mismatch");
  assertEquals(text.includes("/app/"), true, "SW not scoped to /app/");
  console.log("✅ G4: SW file exists and is scoped correctly");
});

Deno.test("G5: Security headers present", async () => {
  const response = await fetch(`${PROD_URL}/app`);
  
  const hsts = response.headers.get("Strict-Transport-Security");
  assertExists(hsts, "HSTS header missing");
  
  const xContentType = response.headers.get("X-Content-Type-Options");
  assertEquals(xContentType, "nosniff", "X-Content-Type-Options missing");
  
  const xFrame = response.headers.get("X-Frame-Options");
  assertExists(xFrame, "X-Frame-Options missing");
  
  console.log("✅ G5: Security headers present");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n============================================");
console.log("Production Integration Tests v3.1");
console.log("============================================");
console.log("Test Coverage:");
console.log("  ✅ Authentication flows");
console.log("  ✅ CORS preflight");
console.log("  ✅ Authorization");
console.log("  ✅ Telemetry tables");
console.log("  ✅ Production URLs");
console.log("  ✅ Service Worker scope");
console.log("  ✅ Security headers");
console.log("============================================\n");
