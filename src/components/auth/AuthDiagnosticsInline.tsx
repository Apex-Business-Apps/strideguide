import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface DiagnosticResults {
  origin: string;
  swController: string | null;
  swCount: number;
  healthStatus: number | string;
  authTest: string;
  preflightBlocked?: boolean;
  hasSession: boolean;
}

export function AuthDiagnosticsInline() {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const results: Partial<DiagnosticResults> = {};

    results.origin = window.location.origin;

    if ('serviceWorker' in navigator) {
      results.swController = navigator.serviceWorker.controller?.scriptURL || null;
      const regs = await navigator.serviceWorker.getRegistrations();
      results.swCount = regs.length;
    } else {
      results.swController = 'NOT_SUPPORTED';
      results.swCount = 0;
    }

    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    
    try {
      if (!supabaseUrl) {
        results.healthStatus = 0;
        return results;
      }
      const healthResp = await fetch(`${supabaseUrl}/auth/v1/health`, { cache: 'no-store' });
      results.healthStatus = healthResp.status;
    } catch (_err: unknown) {
      results.healthStatus = 'FAILED';
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'dummy-12345',
      });
      results.authTest = error?.message || 'OK';
    } catch (err: unknown) {
      const error = err as Error;
      results.authTest = error.message;
      results.preflightBlocked = error.name === 'TypeError';
    }

    try {
      const { data } = await supabase.auth.getSession();
      results.hasSession = !!data.session;
    } catch (_err) {
      results.hasSession = false;
    }

    setDiagnostics(results as DiagnosticResults);
    setIsLoading(false);
  };

  const unregisterSW = async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      alert('SW unregistered. Reload page.');
      window.location.reload();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          runDiagnostics();
        }}
        className="text-xs text-muted-foreground underline hover:text-foreground mt-4 block"
      >
        Run diagnostics
      </button>
    );
  }

  const Row = ({ label, value, ok }: { label: string; value: string; ok: boolean }) => {
    const Icon = ok ? CheckCircle : XCircle;
    const bg = ok ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500';
    const text = ok ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300';

    return (
      <div className={`p-2 rounded border ${bg} flex items-center gap-2`}>
        <Icon className={`h-4 w-4 ${text}`} />
        <div className="flex-1 text-xs">
          <span className="font-semibold">{label}:</span> <span className={`font-mono ${text}`}>{value}</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-3 mt-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Diagnostics</h3>
        <div className="flex gap-1">
          <Button onClick={runDiagnostics} disabled={isLoading} size="sm" variant="ghost">
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsOpen(false)} size="sm" variant="ghost">✕</Button>
        </div>
      </div>

      {diagnostics && (
        <>
          <Row label="Origin" value={diagnostics.origin} ok={true} />
          <Row label="SW Active" value={diagnostics.swCount === 0 ? 'None' : `${diagnostics.swCount} found`} ok={diagnostics.swCount === 0} />
          <Row label="Health" value={String(diagnostics.healthStatus)} ok={diagnostics.healthStatus === 200} />
          <Row label="Auth Test" value={diagnostics.authTest} ok={!diagnostics.preflightBlocked} />
          
          {diagnostics.preflightBlocked && (
            <div className="bg-red-500/10 border border-red-500 rounded p-2 text-xs text-red-600 dark:text-red-400">
              <strong>CORS blocked.</strong> Add current URL to Supabase Dashboard → Auth → Redirect URLs.
            </div>
          )}

          <Button onClick={unregisterSW} variant="destructive" size="sm" className="w-full mt-2">
            Unregister SW Now
          </Button>
        </>
      )}
    </Card>
  );
}
