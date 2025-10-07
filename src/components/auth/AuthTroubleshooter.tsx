import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ServiceWorkerDiagnostic } from "@/utils/ServiceWorkerDiagnostic";
import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";

export function AuthTroubleshooter() {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const status = await ServiceWorkerDiagnostic.getStatus();
    setDiagnostics(status);
    setIsLoading(false);
  };

  const handleClearAndReload = async () => {
    if (confirm("This will clear all cached data and reload the app. Continue?")) {
      await ServiceWorkerDiagnostic.clearCachesAndReload();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          runDiagnostics();
        }}
        className="text-xs text-muted-foreground underline hover:text-foreground mt-2"
      >
        Having login issues? Run diagnostics
      </button>
    );
  }

  return (
    <Card className="p-4 mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Auth Diagnostics</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          ✕
        </Button>
      </div>

      {diagnostics && (
        <div className="space-y-2 text-xs">
          <Alert variant={diagnostics.online ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {diagnostics.online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <AlertDescription>
                Network: {diagnostics.online ? "Online" : "Offline"} 
                {diagnostics.connection !== 'unknown' && ` (${diagnostics.connection})`}
              </AlertDescription>
            </div>
          </Alert>

          <div className="bg-muted p-2 rounded text-xs font-mono">
            <div>SW Supported: {diagnostics.supported ? "✓" : "✗"}</div>
            <div>Active SW: {diagnostics.controller ? "✓" : "✗"}</div>
            <div>Registrations: {diagnostics.registrations.length}</div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              If login fails on mobile data:
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Disable Data Saver / VPN</li>
                <li>Try WiFi instead</li>
                <li>Clear cache below</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={runDiagnostics}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAndReload}
        >
          Clear Cache & Reload
        </Button>
      </div>
    </Card>
  );
}
