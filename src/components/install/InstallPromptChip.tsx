import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InstallManager } from '@/utils/InstallManager';
import { useTranslation } from 'react-i18next';

/**
 * InstallPromptChip - Compact, high-visibility install prompt
 * T-A: Surface PWA Install UI
 * 
 * Features:
 * - Shows only when install is available (Android/Desktop)
 * - One-shot behavior: dismissed state persisted
 * - Bilingual support (EN/FR)
 * - Runtime flag: ui.enablePWAInstallChip
 */

interface InstallPromptChipProps {
  className?: string;
}

const STORAGE_KEY = 'strideguide_install_chip_dismissed';
const FEATURE_FLAG_KEY = 'ui.enablePWAInstallChip';

export const InstallPromptChip: React.FC<InstallPromptChipProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check runtime feature flag
    const featureEnabled = localStorage.getItem(FEATURE_FLAG_KEY) !== 'false'; // default true
    if (!featureEnabled) {
      console.log('[InstallChip] Feature disabled by runtime flag');
      return;
    }

    // Check if already dismissed
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (isDismissed) {
      console.log('[InstallChip] Already dismissed');
      return;
    }

    // Subscribe to install state changes
    const unsubscribe = InstallManager.subscribe((state) => {
      // Show only for Android/Desktop when install is available
      const shouldShow = 
        state.canInstall && 
        !state.isInstalled && 
        (state.platform === 'android' || state.platform === 'desktop') &&
        state.installType === 'native';

      setIsVisible(shouldShow);
      
      if (shouldShow) {
        console.log('[InstallChip] Showing install prompt', state);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const result = await InstallManager.showInstallPrompt();
      
      if (result.success) {
        console.log('[InstallChip] Install accepted');
        // Hide chip after successful install
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
      } else if (result.outcome === 'dismissed') {
        console.log('[InstallChip] Install dismissed by user');
        // Hide chip after dismissal
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    } catch (error) {
      console.error('[InstallChip] Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    console.log('[InstallChip] Dismissed by close button');
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card 
      className={`
        inline-flex items-center gap-3 px-4 py-3 
        bg-primary/5 border-primary/20 
        shadow-sm hover:shadow-md transition-shadow
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <Download className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {t('install.available', 'Install available')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('install.hint', 'Install for offline access and faster startup')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleInstall}
          disabled={isInstalling}
          size="sm"
          className="min-h-[36px] min-w-[80px]"
          aria-label={t('install.button', 'Install App')}
        >
          {isInstalling ? (
            <span className="animate-spin">⏳</span>
          ) : (
            t('install.button', 'Install')
          )}
        </Button>

        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          aria-label={t('common.dismiss', 'Dismiss')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
