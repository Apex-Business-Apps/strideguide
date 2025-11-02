import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useI18nGuard } from "@/utils/i18nGuard";
import ConsentModal from "./components/ConsentModal";
import { DEV_CONFIG } from "@/config/dev";

// Lazy load pages for code splitting and performance
const Index = lazy(() => import("./pages/Index"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Showcase = lazy(() => import("./screens/Showcase"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const AuthDiagnosticsPage = lazy(() => import("./pages/AuthDiagnosticsPage"));
const AuthMinPage = lazy(() => import("./pages/AuthMinPage"));
const Diag = lazy(() => import("./pages/_diag"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Optimized QueryClient with production settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes - increased from 5 to prevent connection errors
      gcTime: 1000 * 60 * 60, // 60 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true, // Only refetch on actual network reconnect
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

const App = () => {
  // Run i18n guard in development to catch unresolved keys
  useI18nGuard();
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const effectiveUser = (DEV_CONFIG.BYPASS_AUTH ? (DEV_CONFIG.MOCK_USER as User) : null) || user;

  useEffect(() => {
    // DEV BYPASS: Skip auth entirely if enabled
    if (DEV_CONFIG.BYPASS_AUTH) {
      setUser(DEV_CONFIG.MOCK_USER as User);
      setIsLoading(false);
      return;
    }

    // Set up auth state listener with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle token refresh events silently to prevent disconnection errors
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsLoading(false);
        } else if (event === 'USER_UPDATED') {
          setSession(session);
          setUser(session?.user ?? null);
        } else {
          // For other events (PASSWORD_RECOVERY, etc.), update state normally
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // Session will be updated via onAuthStateChange
  };

  const handleSignOut = () => {
    setUser(null);
    setSession(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ConsentModal />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/landing" element={<Showcase />} />
                <Route path="/app" element={<Index />} />
                <Route 
                  path="/auth" 
                  element={
                    effectiveUser ? (
                      <DashboardPage user={effectiveUser} onSignOut={handleSignOut} />
                    ) : (
                      <AuthPage onAuthSuccess={handleAuthSuccess} />
                    )
                  }
                />
                <Route 
                  path="/dashboard" 
                  element={
                    effectiveUser ? (
                      <DashboardPage user={effectiveUser} onSignOut={handleSignOut} />
                    ) : (
                      <AuthPage onAuthSuccess={handleAuthSuccess} />
                    )
                  }
                />
                <Route path="/pricing" element={<PricingPage onBack={() => window.history.back()} />} />
                <Route path="/help" element={<HelpPage onBack={() => window.history.back()} />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/auth-diagnostics" element={<AuthDiagnosticsPage />} />
                <Route path="/auth-min" element={<AuthMinPage />} />
                <Route path="/_diag" element={<Diag />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
