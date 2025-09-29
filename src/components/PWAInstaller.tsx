import React, { useState, useEffect } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { InstallManager } from '@/utils/InstallManager';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export const PWAInstaller: React.FC = () => {
  const [installState, setInstallState] = useState(InstallManager.getState());
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to install manager state changes
    const unsubscribe = InstallManager.subscribe(setInstallState);
    return unsubscribe;
  }, []);

  const handleInstallClick = async () => {
    if (installState.platform === 'ios') {
      setShowIOSInstructions(true);
      return;
    }

    try {
      await InstallManager.showInstallPrompt();
      toast({
        title: t('install.success', 'Success'),
        description: t('install.installed', 'StrideGuide has been installed!'),
      });
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: t('install.error', 'Error'),
        description: t('install.failed', 'Installation failed. Please try again.'),
        variant: 'destructive',
      });
    }
  };

  const handleDismiss = () => {
    InstallManager.markDismissed();
  };

  if (installState.isInstalled || !installState.canInstall) {
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
            {InstallManager.getInstallInstructions(i18n.language as 'en' | 'fr').map((instruction, index) => (
              <div key={index} className="flex items-center gap-3">
                <Badge variant="outline" className="min-w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  {index + 1}
                </Badge>
                <span className="text-sm">{instruction}</span>
              </div>
            ))}
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
              <p className="font-medium text-sm">{t('install.available', 'Install available')}</p>
              <p className="text-xs text-muted-foreground">
                {installState.platform === 'ios' 
                  ? t('install.iosHint', 'Add to Home Screen for best experience')
                  : t('install.hint', 'Install for offline access and faster startup')
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
              aria-label={t('install.button', 'Install App')}
            >
              {installState.platform === 'ios' ? <Plus className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {installState.platform === 'ios' ? t('install.addToHome', 'Add to Home') : t('install.button', 'Install App')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstaller;