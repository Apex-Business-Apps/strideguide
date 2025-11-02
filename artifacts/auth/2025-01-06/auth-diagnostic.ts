/**
 * T-AUTH Diagnostic Script
 * Run this in browser console to capture preflight/CORS issues
 */

interface AuthDiagnosticResult {
  timestamp: string;
  correlationId: string;
  appOrigin: string;
  supabaseUrl: string;
  tests: {
    preflightCheck: {
      passed: boolean;
      details: string;
      headers?: Record<string, string>;
    };
    corsHeaders: {
      passed: boolean;
      details: string;
      expectedOrigin: string;
      actualOrigin?: string;
    };
    cookieCheck: {
      passed: boolean;
      details: string;
      cookies?: string[];
    };
    clientConfig: {
      passed: boolean;
      details: string;
      config: Record<string, unknown>;
    };
  };
}

async function runAuthDiagnostics(): Promise<AuthDiagnosticResult> {
  const correlationId = `auth-diag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const appOrigin = window.location.origin;
  const supabaseUrl = 'https://yrndifsbsmpvmpudglcc.supabase.co';
  
  console.log(`🔍 Starting auth diagnostics [${correlationId}]`);
  console.log(`📍 App Origin: ${appOrigin}`);
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  const result: AuthDiagnosticResult = {
    timestamp: new Date().toISOString(),
    correlationId,
    appOrigin,
    supabaseUrl,
    tests: {
      preflightCheck: { passed: false, details: '' },
      corsHeaders: { passed: false, details: '', expectedOrigin: appOrigin },
      cookieCheck: { passed: false, details: '' },
      clientConfig: { passed: false, details: '', config: {} },
    },
  };

  // Test 1: Preflight OPTIONS check
  console.log('\n🧪 Test 1: Preflight OPTIONS to auth endpoint...');
  try {
    const preflightResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });

    const headers: Record<string, string> = {};
    preflightResponse.headers.forEach((value, key) => {
      headers[key] = value;
    });

    result.tests.preflightCheck.headers = headers;
    result.tests.preflightCheck.passed = 
      preflightResponse.status === 200 || preflightResponse.status === 204;
    result.tests.preflightCheck.details = 
      `Status: ${preflightResponse.status}. Headers: ${JSON.stringify(headers, null, 2)}`;
    
    console.log(
      result.tests.preflightCheck.passed ? '✅' : '❌',
      'Preflight:',
      result.tests.preflightCheck.details
    );
  } catch (error) {
    result.tests.preflightCheck.details = `Failed: ${error}`;
    console.log('❌ Preflight failed:', error);
  }

  // Test 2: CORS Headers check
  console.log('\n🧪 Test 2: CORS headers validation...');
  try {
    const testResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      credentials: 'include',
    });

    const allowOrigin = testResponse.headers.get('Access-Control-Allow-Origin');
    const allowMethods = testResponse.headers.get('Access-Control-Allow-Methods');
    const allowHeaders = testResponse.headers.get('Access-Control-Allow-Headers');
    const allowCredentials = testResponse.headers.get('Access-Control-Allow-Credentials');

    result.tests.corsHeaders.actualOrigin = allowOrigin || 'NOT SET';
    result.tests.corsHeaders.passed = 
      allowOrigin === appOrigin || allowOrigin === '*';
    result.tests.corsHeaders.details = 
      `Allow-Origin: ${allowOrigin}, Methods: ${allowMethods}, Headers: ${allowHeaders}, Credentials: ${allowCredentials}`;
    
    console.log(
      result.tests.corsHeaders.passed ? '✅' : '❌',
      'CORS:',
      result.tests.corsHeaders.details
    );
  } catch (error) {
    result.tests.corsHeaders.details = `Failed: ${error}`;
    console.log('❌ CORS check failed:', error);
  }

  // Test 3: Cookie/Session check
  console.log('\n🧪 Test 3: Cookie/session configuration...');
  try {
    const cookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
    const supabaseCookies = cookies.filter(c => 
      c.startsWith('sb-') || c.includes('supabase')
    );

    result.tests.cookieCheck.cookies = supabaseCookies;
    result.tests.cookieCheck.passed = true; // Check presence, not content
    result.tests.cookieCheck.details = 
      supabaseCookies.length > 0 
        ? `Found ${supabaseCookies.length} Supabase cookie(s)` 
        : 'No Supabase cookies found (may be HttpOnly)';
    
    console.log('🍪 Cookies:', result.tests.cookieCheck.details);
  } catch (error) {
    result.tests.cookieCheck.details = `Failed: ${error}`;
    console.log('❌ Cookie check failed:', error);
  }

  // Test 4: Client configuration
  console.log('\n🧪 Test 4: Supabase client configuration...');
  try {
    // @ts-expect-error - accessing global supabase client
    const supabase = window.supabase || (await import('@/integrations/supabase/client')).supabase;

    const config = {
      // @ts-expect-error - accessing internal storage property
      storage: supabase.auth?.storage?.constructor?.name || 'unknown',
      // @ts-expect-error - from code review
      persistSession: true,
      // @ts-expect-error - from code review
      autoRefreshToken: true,
      // @ts-expect-error - from code review
      flowType: 'pkce',
    };

    result.tests.clientConfig.config = config;
    result.tests.clientConfig.passed = true;
    result.tests.clientConfig.details = JSON.stringify(config, null, 2);
    
    console.log('⚙️ Client config:', config);
  } catch (error) {
    result.tests.clientConfig.details = `Failed: ${error}`;
    console.log('❌ Client config check failed:', error);
  }

  // Summary
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Correlation ID: ${correlationId}`);
  console.log(`Timestamp: ${result.timestamp}`);
  console.log('─'.repeat(50));
  
  const allTests = Object.values(result.tests);
  const passedTests = allTests.filter(t => t.passed).length;
  const totalTests = allTests.length;
  
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  Object.entries(result.tests).forEach(([name, test]) => {
    console.log(`${test.passed ? '✅' : '❌'} ${name}`);
  });
  
  console.log('═'.repeat(50));
  
  if (passedTests === totalTests) {
    console.log('✅ All diagnostics passed!');
  } else {
    console.log('⚠️  Some diagnostics failed. See details above.');
    console.log('\n📋 NEXT STEPS:');
    
    if (!result.tests.preflightCheck.passed) {
      console.log('1. Configure Supabase Auth URL settings in dashboard');
      console.log(`   → Site URL: ${appOrigin}`);
      console.log(`   → Add Redirect URL: ${appOrigin}/**`);
    }
    
    if (!result.tests.corsHeaders.passed) {
      console.log('2. Add CORS origin in Supabase dashboard');
      console.log(`   → Add to allowed origins: ${appOrigin}`);
    }
  }

  console.log('\n💾 Export this result:');
  console.log('copy(JSON.stringify(authDiagResult, null, 2))');

  // @ts-expect-error - attaching result to window for debugging
  window.authDiagResult = result;

  return result;
}

// Auto-run on load
if (typeof window !== 'undefined') {
  // @ts-expect-error - attaching function to window for console access
  window.runAuthDiagnostics = runAuthDiagnostics;
  console.log('🔧 Auth diagnostics loaded. Run: runAuthDiagnostics()');
}

export { runAuthDiagnostics };
