import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, 
  Navigation, 
  Search, 
  Settings, 
  Shield, 
  Languages, 
  Phone,
  Bell,
  AlertTriangle,
  Zap,
  Bot,
  Eye,
  Menu,
  MessageCircle,
  Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Component imports
import { Logo } from '@/components/Logo';
import SettingsDashboard from '@/components/SettingsDashboard';
import { EnhancedLostItemFinder } from '@/components/EnhancedLostItemFinder';
import VisionPanel from '@/components/VisionPanel';
import { SOSInterface } from '@/components/SOSInterface';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { PWAInstaller } from '@/components/PWAInstaller';
import { WakeLockIndicator } from '@/components/WakeLockIndicator';
import UsageMeter from '@/components/UsageMeter';
import { ActionPromptModal } from '@/components/modals/ActionPromptModal';
import { FeatureGate } from '@/components/enterprise/FeatureGate';
import { HazardNotificationScreen } from '@/components/premium/HazardNotificationScreen';
import { EnhancedNotificationSystem } from '@/components/premium/EnhancedNotificationSystem';
import { InstallPromptChip } from '@/components/install/InstallPromptChip';
import { IOSInstallSheet } from '@/components/install/IOSInstallSheet';

// Hooks and utilities
import { useAIBot } from '@/hooks/useAIBot';
import { useSubscription } from '@/hooks/useSubscription';
import { BatteryGuard } from '@/utils/BatteryGuard';
import { SOSGuard } from '@/utils/SOSGuard';
import { WakeLockManager } from '@/utils/WakeLockManager';
import { AudioArmer } from '@/utils/AudioArmer';
import { HealthManager } from '@/utils/HealthManager';
import { UTMTracker } from '@/utils/utm-tracker';

// Types for enhanced notification system
interface EnhancedNotification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  category: 'safety' | 'navigation' | 'system' | 'social';
  isContextual: boolean;
  requiresAcknowledgment: boolean;
  hasAudio: boolean;
  location?: string;
  actionable?: boolean;
  dismissed?: boolean;
  acknowledged?: boolean;
}

const Index: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState(null);
  
  // Core state
  const [currentView, setCurrentView] = useState<'home' | 'guidance' | 'item-finder' | 'sos' | 'settings' | 'hazard-screen'>('home');
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);
  const [audioArmed, setAudioArmed] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: 'confirmation' | 'input' | 'hazard-report' | 'emergency-setup';
    title: string;
    description: string;
    severity?: 'info' | 'warning' | 'critical';
    confirmText?: string;
    action?: (data?: any) => void;
  } | null>(null);
  
  // Premium notification system state
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([
    {
      id: '1',
      type: 'critical',
      title: 'AI Bot Connection Issue',
      message: 'Unable to connect to AI services after login. Retrying...',
      timestamp: new Date(),
      priority: 'high',
      category: 'system',
      isContextual: true,
      requiresAcknowledgment: true,
      hasAudio: true,
      dismissed: false,
      acknowledged: false,
    }
  ]);
  const [notificationSystemVisible, setNotificationSystemVisible] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [notificationsPaused, setNotificationsPaused] = useState(false);
  
  // Hooks
  const aiBot = useAIBot(user);
  const { subscription, hasFeatureAccess } = useSubscription(user);
  
  const isPremiumUser = hasFeatureAccess('enhanced_notifications');

  // Get current user on mount (no duplicate listener - App.tsx handles global auth state)
  useEffect(() => {
    // Single check for current session - App.tsx handles all auth state changes
    // No need for duplicate listener or notification logic (handled by other useEffects)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    }).catch(() => {
      // Silent fail - App.tsx handles auth state globally
    });
  }, []);

  // Initialize system guards and check onboarding
  useEffect(() => {
    BatteryGuard.initialize();
    // SOSGuard is singleton, already initialized
    
    // Track app entry with UTM attribution
    UTMTracker.trackAppEntry();
    
    const unsubscribe = HealthManager.onHealthChange?.((status) => {
      if (status.overall === 'critical') {
        addNotification({
          id: `health-${Date.now()}`,
          type: 'critical',
          title: 'Critical System Error',
          message: 'System health is critical. Please restart the application.',
          timestamp: new Date(),
          priority: 'high',
          category: 'system',
          isContextual: false,
          requiresAcknowledgment: true,
          hasAudio: true,
        });
      }
    }) || (() => {});

    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Monitor AI bot status
  useEffect(() => {
    if (aiBot.isConnected && user) {
      // Remove AI bot error notifications and add success
      setNotifications(prev => 
        prev.filter(n => !n.message.includes('AI') && !n.message.includes('bot'))
      );
      
      addNotification({
        id: `ai-success-${Date.now()}`,
        type: 'success',
        title: 'AI Assistant Ready',
        message: 'Your AI assistant is now connected and ready to help.',
        timestamp: new Date(),
        priority: 'low',
        category: 'system',
        isContextual: true,
        requiresAcknowledgment: false,
        hasAudio: false,
      });
    } else if (aiBot.error) {
      addNotification({
        id: `ai-error-${Date.now()}`,
        type: 'critical',
        title: 'AI Assistant Unavailable',
        message: `Connection failed: ${aiBot.error}. Some features may be limited.`,
        timestamp: new Date(),
        priority: 'high',
        category: 'system',
        isContextual: true,
        requiresAcknowledgment: true,
        hasAudio: true,
      });
    }
  }, [aiBot.isConnected, aiBot.error, user]);

  // Notification management functions
  const addNotification = useCallback((notification: Omit<EnhancedNotification, 'id'> & { id?: string }) => {
    const newNotification: EnhancedNotification = {
      ...notification,
      id: notification.id || `notif-${Date.now()}`,
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 19)]); // Keep max 20 notifications
    
    if (isPremiumUser && !notificationsPaused) {
      setNotificationSystemVisible(true);
    }
  }, [isPremiumUser, notificationsPaused]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );
  }, []);

  const acknowledgeNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, acknowledged: true } : n)
    );
  }, []);

  // Modal helper functions
  const showModal = useCallback((config: typeof modalConfig) => {
    setModalConfig(config);
    setShowActionModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowActionModal(false);
    setModalConfig(null);
  }, []);

  // Enhanced interaction handlers with modals
  const handleGuidanceToggle = useCallback(async () => {
    if (!audioArmed) {
      showModal({
        type: 'confirmation',
        title: 'Enable Audio',
        description: 'StrideGuide needs audio access to provide voice guidance. Allow audio access to continue?',
        severity: 'info',
        confirmText: 'Enable Audio',
        action: async () => {
          try {
            await AudioArmer.initialize();
            setAudioArmed(true);
            closeModal();
            handleGuidanceToggle(); // Retry after audio is enabled
          } catch (error) {
            toast({
              title: 'Audio Failed',
              description: 'Unable to enable audio. Please check your device settings.',
              variant: 'destructive',
            });
          }
        }
      });
      return;
    }

    if (!isGuidanceActive) {
      showModal({
        type: 'confirmation',
        title: 'Start Vision Guidance',
        description: 'This will activate the camera and start real-time obstacle detection. Your device will stay awake during guidance.',
        severity: 'info',
        confirmText: 'Start Guidance',
        action: async () => {
          try {
            if (WakeLockManager.isSupported()) {
              await WakeLockManager.request();
            }
            setIsGuidanceActive(true);
            setCurrentView('guidance');
            closeModal();
            
            addNotification({
              id: `guidance-start-${Date.now()}`,
              type: 'info',
              title: 'Guidance Active',
              message: 'Vision guidance is now active. Camera is monitoring for obstacles.',
              timestamp: new Date(),
              priority: 'medium',
              category: 'navigation',
              isContextual: true,
              requiresAcknowledgment: false,
              hasAudio: true,
            });
          } catch (error) {
            toast({
              title: 'Guidance Failed',
              description: 'Unable to start guidance. Please try again.',
              variant: 'destructive',
            });
          }
        }
      });
    } else {
      WakeLockManager.release();
      setIsGuidanceActive(false);
      setCurrentView('home');
      
      addNotification({
        id: `guidance-stop-${Date.now()}`,
        type: 'info',
        title: 'Guidance Stopped',
        message: 'Vision guidance has been deactivated.',
        timestamp: new Date(),
        priority: 'low',
        category: 'navigation',
        isContextual: true,
        requiresAcknowledgment: false,
        hasAudio: false,
      });
    }
  }, [audioArmed, isGuidanceActive, showModal, closeModal, addNotification, toast]);

  const handleSOSPress = useCallback(() => {
    showModal({
      type: 'confirmation',
      title: 'Emergency SOS',
      description: 'This will immediately contact your emergency contacts and share your location. Continue only in case of real emergency.',
      severity: 'critical',
      confirmText: 'Send SOS',
      action: () => {
        setCurrentView('sos');
        closeModal();
        
        addNotification({
          id: `sos-${Date.now()}`,
          type: 'critical',
          title: 'SOS Activated',
          message: 'Emergency contacts have been notified and location shared.',
          timestamp: new Date(),
          priority: 'high',
          category: 'safety',
          isContextual: false,
          requiresAcknowledgment: true,
          hasAudio: true,
        });
      }
    });
  }, [showModal, closeModal, addNotification]);

  const handleItemFinder = useCallback(() => {
    showModal({
      type: 'input',
      title: 'Find Lost Item',
      description: 'What item are you looking for? Describe it briefly.',
      severity: 'info',
      confirmText: 'Start Search',
      action: (data: { value: string }) => {
        setCurrentView('item-finder');
        closeModal();
        
        addNotification({
          id: `search-${Date.now()}`,
          type: 'info',
          title: 'Item Search Started',
          message: `Searching for: ${data.value}. Point your camera around the area.`,
          timestamp: new Date(),
          priority: 'medium',
          category: 'navigation',
          isContextual: true,
          requiresAcknowledgment: false,
          hasAudio: true,
        });
      }
    });
  }, [showModal, closeModal, addNotification]);

  const handleQuickActions = useCallback(() => {
    // Show AI chat interface for premium users
    if (isPremiumUser && aiBot.isConnected) {
      showModal({
        type: 'input',
        title: 'AI Assistant',
        description: 'Ask your AI assistant for help with navigation, safety tips, or general questions.',
        severity: 'info',
        confirmText: 'Send Message',
        action: (data: { value: string }) => {
          aiBot.sendMessage(data.value);
          closeModal();
          
          addNotification({
            id: `ai-message-${Date.now()}`,
            type: 'info',
            title: 'Message Sent',
            message: 'Your AI assistant is processing your request...',
            timestamp: new Date(),
            priority: 'low',
            category: 'system',
            isContextual: true,
            requiresAcknowledgment: false,
            hasAudio: false,
          });
        }
      });
    } else {
      // Standard quick action menu for free users
      showModal({
        type: 'confirmation',
        title: 'Quick Actions',
        description: 'Access frequently used features and shortcuts.',
        severity: 'info',
        confirmText: 'Continue',
        action: () => {
          closeModal();
          // Could show a menu or specific action
        }
      });
    }
  }, [isPremiumUser, aiBot, showModal, closeModal, addNotification]);

  // Other handlers
  const toggleLanguage = useCallback(() => {
    const newLang = currentLanguage === 'en' ? 'fr' : 'en';
    setCurrentLanguage(newLang);
    i18n.changeLanguage(newLang);
    
    addNotification({
      id: `lang-${Date.now()}`,
      type: 'info',
      title: 'Language Changed',
      message: `Interface language changed to ${newLang === 'en' ? 'English' : 'Français'}`,
      timestamp: new Date(),
      priority: 'low',
      category: 'system',
      isContextual: false,
      requiresAcknowledgment: false,
      hasAudio: false,
    });
  }, [currentLanguage, i18n, addNotification]);

  const handleBackToHome = useCallback(() => {
    if (isGuidanceActive) {
      WakeLockManager.release();
      setIsGuidanceActive(false);
    }
    setCurrentView('home');
  }, [isGuidanceActive]);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('onboarding-completed', 'true');
    setShowOnboarding(false);
  }, []);

  const handleOnboardingSkip = useCallback(() => {
    localStorage.setItem('onboarding-completed', 'true');
    setShowOnboarding(false);
  }, []);

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'guidance':
        return <VisionPanel onBack={handleBackToHome} />;
      case 'item-finder':
        return <EnhancedLostItemFinder onBack={handleBackToHome} />;
      case 'sos':
        return <SOSInterface onBack={handleBackToHome} />;
      case 'settings':
        return <SettingsDashboard onBack={handleBackToHome} replayTutorial={() => setShowOnboarding(true)} />;
      case 'hazard-screen':
        return (
          <FeatureGate
            feature="hazard_notification_screen"
            user={user}
            showUpgrade={true}
            onUpgrade={() => {
              toast({
                title: "Premium Feature",
                description: "Upgrade to Premium to access the Hazard Notification Screen",
              });
            }}
          >
            <HazardNotificationScreen onBack={handleBackToHome} />
          </FeatureGate>
        );
      default:
        return null;
    }
  };

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <OnboardingTutorial
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  if (currentView !== 'home') {
    return (
      <div className="min-h-screen bg-background">
        {renderCurrentView()}
        {/* Premium notification system overlay */}
        <FeatureGate
          feature="enhanced_notifications"
          user={user}
          showUpgrade={false}
        >
          <EnhancedNotificationSystem
            isVisible={notificationSystemVisible}
            notifications={notifications.filter(n => !n.dismissed)}
            onNotificationDismiss={dismissNotification}
            onNotificationAcknowledge={acknowledgeNotification}
            onSystemMute={() => setNotificationsMuted(!notificationsMuted)}
            onSystemPause={() => setNotificationsPaused(!notificationsPaused)}
            isMuted={notificationsMuted}
            isPaused={notificationsPaused}
            isPremium={isPremiumUser}
          />
        </FeatureGate>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header with Logo and Controls */}
        <div className="text-center space-y-4">
          <div className="flex justify-between items-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotificationSystemVisible(!notificationSystemVisible)}
              className="min-h-[44px] px-3"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.filter(n => !n.dismissed && !n.acknowledged).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {notifications.filter(n => !n.dismissed && !n.acknowledged).length}
                </Badge>
              )}
            </Button>
            
            <div className="flex justify-center flex-1">
              <Logo variant="wordmark" className="h-16 w-auto" />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="min-h-[44px] px-3"
              aria-label="Toggle Language"
            >
              <Languages className="h-4 w-4 mr-1" />
              {currentLanguage.toUpperCase()}
            </Button>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {t('hero.title')}
          </p>
          
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="secondary">{t('badge.langs')}</Badge>
            <Badge variant="secondary">{t('badge.offline')}</Badge>
            <Badge variant="secondary">{t('badge.privacy')}</Badge>
            {isPremiumUser && (
              <Badge variant="default" className="gap-1">
                <Zap className="h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
          
          <UsageMeter />
        </div>

        {/* Top Bar: Install Chip + Language Toggle (≤5 controls) */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <InstallPromptChip />
          <Button
            onClick={() => setCurrentLanguage(currentLanguage === 'en' ? 'fr' : 'en')}
            variant="ghost"
            size="sm"
            className="min-h-[44px] min-w-[44px]"
            aria-label={currentLanguage === 'en' ? 'Passer au français' : 'Switch to English'}
          >
            <Globe className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">{currentLanguage === 'en' ? 'FR' : 'EN'}</span>
          </Button>
        </div>
        
        <IOSInstallSheet />

        {/* AI Bot Status */}
        {user && (
          <Card className={`transition-all duration-300 ${
            aiBot.isConnected ? 'border-green-500 bg-green-500/5' : 
            aiBot.error ? 'border-destructive bg-destructive/5' : 
            'border-warning bg-warning/5'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bot className={`h-5 w-5 ${
                  aiBot.isConnected ? 'text-green-500' : 
                  aiBot.error ? 'text-destructive' : 
                  'text-warning'
                }`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    AI Assistant: {
                      aiBot.isConnected ? 'Connected' :
                      aiBot.isLoading ? 'Connecting...' :
                      'Connection Failed'
                    }
                  </p>
                  {aiBot.error && (
                    <p className="text-xs text-muted-foreground">{aiBot.error}</p>
                  )}
                </div>
                {aiBot.error && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={aiBot.retryConnection}
                    disabled={aiBot.isLoading}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Actions - Modal-based Interface */}
        <div className="grid grid-cols-2 gap-4">
          {/* Primary: Vision Guidance */}
          <Button
            onClick={handleGuidanceToggle}
            className={`h-24 flex-col gap-2 text-base font-semibold ${
              isGuidanceActive 
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            <Eye className="h-6 w-6" />
            {isGuidanceActive ? 'Stop Guidance' : t('home.start')}
          </Button>

          {/* Item Finder */}
          <Button
            onClick={handleItemFinder}
            variant="outline"
            className="h-24 flex-col gap-2 text-base font-semibold"
          >
            <Search className="h-6 w-6" />
            {t('home.find')}
          </Button>

          {/* Emergency SOS */}
          <Button
            onClick={handleSOSPress}
            variant="destructive"
            className="h-24 flex-col gap-2 text-base font-semibold"
          >
            <AlertTriangle className="h-6 w-6" />
            {t('home.sos')}
          </Button>

          {/* Quick Actions / AI Chat */}
          <Button
            onClick={handleQuickActions}
            variant="outline"
            className="h-24 flex-col gap-2 text-base font-semibold"
          >
            {isPremiumUser && aiBot.isConnected ? (
              <>
                <MessageCircle className="h-6 w-6" />
                AI Assistant
              </>
            ) : (
              <>
                <Menu className="h-6 w-6" />
                {t('home.quick')}
              </>
            )}
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setCurrentView('settings')}
            variant="outline"
            className="h-16 flex-col gap-1"
          >
            <Settings className="h-5 w-5" />
            <span className="text-sm">{t('home.settings')}</span>
          </Button>

          <FeatureGate
            feature="hazard_notification_screen"
            user={user}
            showUpgrade={false}
            fallback={
              <Button
                variant="outline"
                className="h-16 flex-col gap-1 opacity-60"
                disabled
              >
                <Shield className="h-5 w-5" />
                <span className="text-sm">Safety Center</span>
                <Badge variant="outline" className="text-xs mt-1">Premium</Badge>
              </Button>
            }
          >
            <Button
              onClick={() => setCurrentView('hazard-screen')}
              variant="outline"
              className="h-16 flex-col gap-1"
            >
              <Shield className="h-5 w-5" />
              <span className="text-sm">Safety Center</span>
              {isPremiumUser && (
                <Badge variant="secondary" className="text-xs mt-1">Premium</Badge>
              )}
            </Button>
          </FeatureGate>
        </div>

        <PWAInstaller />

        {/* Status Indicators */}
        <div className="space-y-2">
          {!audioArmed && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs">
                {t('audio.tapToArm')}
              </Badge>
            </div>
          )}

          {isGuidanceActive && (
            <div className="text-center space-y-2">
              <Badge variant="secondary" className="text-xs">
                Guidance active
              </Badge>
              <WakeLockIndicator />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2 pt-4">
          <p>Built in Canada • Privacy first • Works offline</p>
          <p className="text-xs">Version 1.0.0</p>
        </div>

        {/* Aria-live region for status announcements */}
        <div 
          id="status-announcer" 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        />
      </div>

      {/* Action Modal */}
      {showActionModal && modalConfig && (
        <ActionPromptModal
          isOpen={showActionModal}
          onClose={closeModal}
          onConfirm={modalConfig.action || (() => {})}
          type={modalConfig.type}
          title={modalConfig.title}
          description={modalConfig.description}
          severity={modalConfig.severity}
          confirmText={modalConfig.confirmText}
          isPremium={isPremiumUser}
        />
      )}

      {/* Premium Enhanced Notification System */}
      <FeatureGate
        feature="enhanced_notifications"
        user={user}
        showUpgrade={false}
      >
        <EnhancedNotificationSystem
          isVisible={notificationSystemVisible}
          notifications={notifications.filter(n => !n.dismissed)}
          onNotificationDismiss={dismissNotification}
          onNotificationAcknowledge={acknowledgeNotification}
          onSystemMute={() => setNotificationsMuted(!notificationsMuted)}
          onSystemPause={() => setNotificationsPaused(!notificationsPaused)}
          isMuted={notificationsMuted}
          isPaused={notificationsPaused}
          isPremium={isPremiumUser}
        />
      </FeatureGate>

      {/* T-B: iOS Install Sheet - bottom sheet for iOS users */}
      <IOSInstallSheet />
    </div>
  );
};

export default Index;
