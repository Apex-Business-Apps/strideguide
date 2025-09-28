import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, Plus } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstaller = () => {
  const { isInstalled, isInstallable, isIOS, showInstallPrompt, canInstall } = usePWA();

  if (isInstalled) return null;

  return (
    <Card className="w-full max-w-md mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Install StrideGuide
        </CardTitle>
        <CardDescription>
          Install the app for offline access and better performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canInstall && (
          <Button 
            onClick={showInstallPrompt}
            className="w-full h-12 text-base"
            size="lg"
          >
            <Download className="h-5 w-5 mr-2" />
            Install App
          </Button>
        )}
        
        {isIOS && (
          <div className="space-y-3 p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium">iOS Installation:</p>
            <ol className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">1.</span>
                <div className="flex items-center gap-1">
                  Tap the <Share className="h-4 w-4 inline" /> share button
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">2.</span>
                <div className="flex items-center gap-1">
                  Select <Plus className="h-4 w-4 inline" /> "Add to Home Screen"
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium">3.</span>
                Tap "Add" to install
              </li>
            </ol>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>✓ Works completely offline</p>
          <p>✓ No internet required for core features</p>
          <p>✓ Privacy-first - data stays on device</p>
        </div>
      </CardContent>
    </Card>
  );
};