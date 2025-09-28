import React, { useState, useEffect } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export const PWAInstaller: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | 'unknown'>('unknown');
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) {
      setPlatform('android');
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      setPlatform('ios');
    } else if (/Windows|Mac|Linux/i.test(userAgent)) {
      setPlatform('desktop');
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, Android browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS Safari, show instructions after a delay if not installed
    if (platform === 'ios' && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [platform, isInstalled]);

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      toast({
        title: 'Install StrideGuide',
        description: 'Installation not available on this device.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        toast({
          title: 'Success',
          description: 'StrideGuide has been installed!',
        });
        setShowInstallPrompt(false);
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: 'Error',
        description: 'Installation failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  if (showIOSInstructions) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Share className="h-5 w-5" />
              Add to Home Screen
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowIOSInstructions(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="min-w-6 h-6 rounded-full flex items-center justify-center text-xs">
                1
              </Badge>
              <span className="text-sm">Tap the Share button</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="min-w-6 h-6 rounded-full flex items-center justify-center text-xs">
                2
              </Badge>
              <span className="text-sm">Scroll down and tap 'Add to Home Screen'</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="min-w-6 h-6 rounded-full flex items-center justify-center text-xs">
                3
              </Badge>
              <span className="text-sm">Tap 'Add' to confirm</span>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Benefits:</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 bg-primary rounded-full" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 bg-primary rounded-full" />
                <span>Faster startup</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 bg-primary rounded-full" />
                <span>Full screen experience</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 bg-primary rounded-full" />
                <span>Easy access from home screen</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Install available</p>
              <p className="text-xs text-muted-foreground">
                {platform === 'ios' 
                  ? 'Add to Home Screen for best experience'
                  : 'Install for offline access and faster startup'
                }
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="min-h-[44px] px-4"
              aria-label="Install App"
            >
              {platform === 'ios' ? <Plus className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {platform === 'ios' ? 'Add to Home' : 'Install App'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstaller;