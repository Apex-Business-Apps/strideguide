import React, { useState, useEffect } from 'react';
import { Share, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InstallManager } from '@/utils/InstallManager';
import { useTranslation } from 'react-i18next';

/**
 * IOSInstallSheet - Bottom sheet with iOS installation instructions
 * T-B: Elevate iOS A2HS Helper
 * 
 * Features:
 * - Shows only on Safari/iOS when not installed
 * - Step-by-step instructions with visual cues
 * - Never shows in standalone mode
 * - Bilingual support (EN/FR)
 * - Runtime flag: ui.enableIOSA2HSHelper
 */

const STORAGE_KEY = 'strideguide_ios_helper_dismissed';
const FEATURE_FLAG_KEY = 'ui.enableIOSA2HSHelper';

export const IOSInstallSheet: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Check runtime feature flag
    const featureEnabled = localStorage.getItem(FEATURE_FLAG_KEY) !== 'false'; // default true
    if (!featureEnabled) {
      console.log('[IOSInstallSheet] Feature disabled by runtime flag');
      return;
    }

    // Check if already dismissed
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (isDismissed) {
      console.log('[IOSInstallSheet] Already dismissed');
      return;
    }

    // Subscribe to install state changes
    const unsubscribe = InstallManager.subscribe((state) => {
      // Show only for iOS when not installed
      const shouldShow = 
        state.platform === 'ios' && 
        !state.isInstalled &&
        state.installType === 'manual';

      setIsVisible(shouldShow);
      
      if (shouldShow) {
        console.log('[IOSInstallSheet] Showing iOS helper', state);
        // Auto-expand after 1 second
        setTimeout(() => setIsExpanded(true), 1000);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = () => {
    console.log('[IOSInstallSheet] Dismissed by user');
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible) {
    return null;
  }

  const currentLang = i18n.language.startsWith('fr') ? 'fr' : 'en';
  const instructions = InstallManager.getInstallInstructions(currentLang);

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={handleDismiss}
          aria-hidden="true"
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          transition-transform duration-300 ease-out
          ${isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}
        `}
        role="dialog"
        aria-label={t('install.iosHint', 'iOS Installation Instructions')}
        aria-modal={isExpanded}
      >
        <Card className="rounded-t-2xl rounded-b-none border-t shadow-2xl">
          {/* Handle and Preview */}
          <div 
            className="flex items-center justify-between px-6 py-4 cursor-pointer"
            onClick={handleToggle}
          >
            <div className="flex items-center gap-3">
              <Share className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t('install.addToHome', 'Add to Home Screen')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('install.iosHint', 'Tap for instructions')}
                </p>
              </div>
            </div>
            
            <ChevronDown 
              className={`h-5 w-5 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <>
              <CardHeader className="pb-3 pt-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {t('install.title', 'Install StrideGuide')}
                  </CardTitle>
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label={t('common.close', 'Close')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pb-6">
                {/* Instructions */}
                <ol className="space-y-3">
                  {instructions.map((instruction, index) => (
                    <li 
                      key={index}
                      className="flex gap-3 text-sm"
                    >
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                        {index + 1}
                      </span>
                      <span className="flex-1 pt-0.5 text-foreground">
                        {instruction}
                      </span>
                    </li>
                  ))}
                </ol>

                {/* Visual Cue */}
                <div className="flex items-center justify-center py-4 px-6 bg-muted/50 rounded-lg border border-border">
                  <div className="text-center space-y-2">
                    <Share className="h-8 w-8 mx-auto text-primary" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">
                      {currentLang === 'fr' 
                        ? 'Recherchez ce bouton dans Safari'
                        : 'Look for this button in Safari'
                      }
                    </p>
                  </div>
                </div>

                {/* Action */}
                <Button
                  onClick={handleDismiss}
                  variant="default"
                  size="lg"
                  className="w-full min-h-[48px]"
                >
                  {t('common.gotIt', 'Got it')}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </>
  );
};
