import React, { useState, useEffect } from 'react';
import { Eye, Search, AlertTriangle, Settings, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import UsageMeter from '@/components/UsageMeter';
import SettingsDashboard from '@/components/SettingsDashboard';
import LostItemFinder from '@/components/LostItemFinder';
import VisionPanel from '@/components/VisionPanel';
import EmergencyInterface from '@/components/EmergencyInterface';
import { PWAInstaller } from '@/components/PWAInstaller';
import { AudioArmer } from '@/utils/AudioArmer';
import { WakeLockManager } from '@/utils/WakeLockManager';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'guidance' | 'finder' | 'sos' | 'settings'>('home');
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);
  const [audioArmed, setAudioArmed] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'fr'>('en');
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  // Initialize audio on first user interaction
  const handleArmAudio = async () => {
    if (!audioArmed) {
      try {
        await AudioArmer.initialize();
        setAudioArmed(true);
        toast({
          title: t('audio.armed'),
          description: t('audio.armedDescription'),
        });
      } catch (error) {
        console.error('Failed to arm audio:', error);
      }
    }
  };

  // Toggle language with announcement
  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'fr' : 'en';
    setCurrentLanguage(newLang);
    i18n.changeLanguage(newLang);
    
    // Announce language change for screen readers
    const announcement = newLang === 'en' ? 'Language changed to English' : 'Langue changée en français';
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.textContent = announcement;
    document.body.appendChild(announcer);
    setTimeout(() => document.body.removeChild(announcer), 1000);
  };

  // Handle guidance toggle with wake lock
  const handleGuidanceToggle = async () => {
    await handleArmAudio();
    
    if (!isGuidanceActive) {
      try {
        await WakeLockManager.request();
        setIsGuidanceActive(true);
        setCurrentView('guidance');
        
        if (audioArmed) {
          AudioArmer.playEarcon('start');
        }
        
        toast({
          title: t('guidance.started'),
          description: t('guidance.stayAwake'),
        });
      } catch (error) {
        console.error('Failed to start guidance:', error);
        toast({
          title: t('guidance.wakeLockFailed'),
          description: t('guidance.wakeLockHelp'),
          variant: 'destructive',
        });
      }
    } else {
      WakeLockManager.release();
      setIsGuidanceActive(false);
      setCurrentView('home');
      
      if (audioArmed) {
        AudioArmer.playEarcon('stop');
      }
      
      toast({
        title: t('guidance.stopped'),
      });
    }
  };

  // Handle SOS with long press
  const handleSOSPress = () => {
    setCurrentView('sos');
  };

  // Handle find item
  const handleFindItem = async () => {
    await handleArmAudio();
    setCurrentView('finder');
  };

  // Handle settings
  const handleSettings = () => {
    setCurrentView('settings');
  };

  // Back to home
  const handleBackToHome = () => {
    setCurrentView('home');
  };

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'guidance':
        return <VisionPanel onBack={handleBackToHome} />;
      case 'finder':
        return <LostItemFinder onBack={handleBackToHome} />;
      case 'sos':
        return <EmergencyInterface onBack={handleBackToHome} />;
      case 'settings':
        return <SettingsDashboard onBack={handleBackToHome} />;
      default:
        return null;
    }
  };

  if (currentView !== 'home') {
    return (
      <div className="min-h-screen bg-background">
        {renderCurrentView()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6" onClick={handleArmAudio}>
      <div className="max-w-md mx-auto space-y-8">
        {/* Header with Logo and Language Toggle */}
        <div className="text-center space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1" />
            <div className="flex justify-center flex-1">
              <Logo variant="wordmark" className="h-16 w-auto" />
            </div>
            <div className="flex-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="min-h-[44px] px-3"
                aria-label={t('language.toggle')}
              >
                <Languages className="h-4 w-4 mr-1" />
                {currentLanguage.toUpperCase()}
              </Button>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {t('app.tagline')}
          </p>
          
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="secondary">{t('app.badges.bilingual')}</Badge>
            <Badge variant="secondary">{t('app.badges.offline')}</Badge>
            <Badge variant="secondary">{t('app.badges.privacy')}</Badge>
          </div>
          
          {/* Usage Meter */}
          <UsageMeter />
        </div>

        {/* Main Controls - Maximum 5 Big Buttons */}
        <div className="space-y-4">
          {/* Primary Action: Start/Stop Guidance */}
          <Button
            onClick={handleGuidanceToggle}
            className={`w-full min-h-[60px] text-lg font-semibold ${
              isGuidanceActive 
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
            aria-label={isGuidanceActive ? t('guidance.stop') : t('guidance.start')}
            role="button"
          >
            <Eye className="mr-3 h-6 w-6" />
            {isGuidanceActive ? t('guidance.stop') : t('guidance.start')}
          </Button>

          {/* Find Lost Item */}
          <Button
            onClick={handleFindItem}
            variant="outline"
            className="w-full min-h-[60px] text-lg font-semibold"
            aria-label={t('finder.title')}
            role="button"
          >
            <Search className="mr-3 h-6 w-6" />
            {t('finder.title')}
          </Button>

          {/* Emergency SOS */}
          <Button
            onClick={handleSOSPress}
            variant="destructive"
            className="w-full min-h-[60px] text-lg font-semibold"
            aria-label={t('sos.title')}
            role="button"
          >
            <AlertTriangle className="mr-3 h-6 w-6" />
            {t('sos.title')}
          </Button>

          {/* Settings */}
          <Button
            onClick={handleSettings}
            variant="outline"
            className="w-full min-h-[60px] text-lg font-semibold"
            aria-label={t('settings.title')}
            role="button"
          >
            <Settings className="mr-3 h-6 w-6" />
            {t('settings.title')}
          </Button>
        </div>

        {/* PWA Install Prompt */}
        <PWAInstaller />

        {/* Status Indicators */}
        <div className="space-y-2">
          {/* Audio Status */}
          {!audioArmed && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs">
                {t('audio.tapToArm')}
              </Badge>
            </div>
          )}

          {/* Wake Lock Status */}
          {isGuidanceActive && (
            <div className="text-center">
              <Badge variant="secondary" className="text-xs">
                {WakeLockManager.isActive() ? t('wake.active') : t('wake.inactive')}
              </Badge>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2 pt-4">
          <p>{t('app.footer.builtin')} • {t('app.footer.privacy')} • {t('app.footer.offline')}</p>
          <p className="text-xs">{t('app.footer.version')}</p>
        </div>
      </div>
    </div>
  );
};

export default Index;