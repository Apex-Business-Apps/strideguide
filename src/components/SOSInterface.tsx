import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Phone, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { AudioArmer } from '@/utils/AudioArmer';
import { HapticManager } from '@/utils/HapticManager';

interface SOSInterfaceProps {
  onBack: () => void;
}

export const SOSInterface: React.FC<SOSInterfaceProps> = ({ onBack }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<number | null>(null);
  const { t } = useTranslation();
  
  const pressStartTime = useRef<number | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const pressTimeout = useRef<NodeJS.Timeout | null>(null);

  // Emergency contact info (would be from settings)
  const emergencyContact = "911";
  const emergencyMessage = t('sos.messageTemplate', { 
    timestamp: new Date().toLocaleString(),
    location: t('sos.locationPlaceholder')
  });

  useEffect(() => {
    return () => {
      // Cleanup intervals on unmount
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      if (pressTimeout.current) {
        clearTimeout(pressTimeout.current);
      }
    };
  }, []);

  const startPress = () => {
    // Check cooldown (15 seconds)
    if (lastTriggered && Date.now() - lastTriggered < 15000) {
      if (AudioArmer.isArmed()) {
        AudioArmer.announceText(t('sos.cooldown', 'Please wait before using SOS again.'));
      }
      return;
    }

    setIsPressed(true);
    pressStartTime.current = Date.now();
    
    // Play initial warning sound
    if (AudioArmer.isArmed()) {
      AudioArmer.playEarcon('warning');
    }
    
    // Start haptic feedback
    HapticManager.vibrate('warning');
    
    // Start countdown after 1.2 seconds
    pressTimeout.current = setTimeout(() => {
      if (isPressed) {
        startCountdown();
      }
    }, 1200);
  };

  const endPress = () => {
    setIsPressed(false);
    pressStartTime.current = null;
    
    if (pressTimeout.current) {
      clearTimeout(pressTimeout.current);
      pressTimeout.current = null;
    }
    
    if (isCountingDown) {
      cancelCountdown();
    }
  };

  const startCountdown = () => {
    setIsCountingDown(true);
    setCountdown(3);
    
    // Announce countdown start
    if (AudioArmer.isArmed()) {
      AudioArmer.announceText(t('sos.countdownStart'));
    }
    
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev - 1;
        
        // Announce countdown number
        if (AudioArmer.isArmed() && newCount > 0) {
          AudioArmer.announceText(newCount.toString());
        }
        
        // Vibration for each count
        HapticManager.vibrate('warning');
        
        // Trigger SOS when countdown reaches 0
        if (newCount <= 0) {
          triggerSOS();
          return 0;
        }
        
        return newCount;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    setIsCountingDown(false);
    setCountdown(3);
    
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    
    // Announce cancellation
    if (AudioArmer.isArmed()) {
      AudioArmer.announceText(t('sos.cancelled'));
    }
    
    // Success haptic
    HapticManager.vibrate('success');
  };

  const triggerSOS = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    
    setSosTriggered(true);
    setIsCountingDown(false);
    setLastTriggered(Date.now());
    
    // Play SOS sound
    if (AudioArmer.isArmed()) {
      AudioArmer.playEarcon('warning');
      AudioArmer.announceText(t('sos.triggered', 'Emergency alert activated'));
    }
    
    // Strong haptic feedback
    HapticManager.vibrate('warning');
    
    // Open SMS with pre-filled message
    const smsUrl = `sms:${emergencyContact}?body=${encodeURIComponent(emergencyMessage)}`;
    
    try {
      window.open(smsUrl, '_self');
    } catch (error) {
      console.error('Failed to open SMS app:', error);
      // Fallback to tel: link
      const telUrl = `tel:${emergencyContact}`;
      window.open(telUrl, '_self');
    }
  };

  const resetSOS = () => {
    setSosTriggered(false);
    setIsPressed(false);
    setIsCountingDown(false);
    setCountdown(3);
  };

  if (sosTriggered) {
    return (
      <div className="min-h-screen bg-destructive/10 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto p-6 text-center space-y-6 border-destructive/50">
          <div className="text-destructive">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{t('sos.triggered')}</h1>
            <p className="text-lg mt-2">{t('sos.helpOnWay')}</p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => window.open(`tel:${emergencyContact}`, '_self')}
              variant="destructive"
              className="w-full min-h-[60px] text-lg"
              aria-label={t('sos.callEmergency')}
            >
              <Phone className="h-6 w-6 mr-3" />
              {t('sos.callEmergency')}
            </Button>
            
            <Button
              onClick={() => window.open(`sms:${emergencyContact}?body=${encodeURIComponent(emergencyMessage)}`, '_self')}
              variant="outline"
              className="w-full min-h-[60px] text-lg"
              aria-label={t('sos.sendMessage')}
            >
              <MessageSquare className="h-6 w-6 mr-3" />
              {t('sos.sendMessage')}
            </Button>
            
            <Button
              onClick={resetSOS}
              variant="secondary"
              className="w-full min-h-[44px]"
              aria-label={t('sos.falseAlarm')}
            >
              {t('sos.falseAlarm')}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground pt-4 border-t">
            <p>{t('sos.emergencyInfo')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="min-h-[44px]"
            aria-label={t('common.back')}
          >
            <X className="h-5 w-5 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-xl font-semibold">{t('sos.title')}</h1>
          <div className="w-20" /> {/* Spacer for center alignment */}
        </div>

        {/* Instructions */}
        <Card className="p-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">{t('sos.instructions.title')}</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t('sos.instructions.step1')}</p>
              <p>{t('sos.instructions.step2')}</p>
              <p>{t('sos.instructions.step3')}</p>
            </div>
          </div>
        </Card>

        {/* SOS Button */}
        <div className="text-center space-y-4">
          <div
            className={`relative mx-auto w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
              isPressed 
                ? 'bg-destructive/90 scale-95 shadow-lg' 
                : 'bg-destructive hover:bg-destructive/90 shadow-xl'
            } ${isCountingDown ? 'animate-pulse' : ''}`}
          >
            <Button
              onMouseDown={startPress}
              onMouseUp={endPress}
              onTouchStart={startPress}
              onTouchEnd={endPress}
              onMouseLeave={endPress}
              className="w-full h-full rounded-full bg-transparent hover:bg-transparent text-white text-xl font-bold focus:ring-4 focus:ring-destructive/50"
              aria-label={t('sos.button')}
              disabled={sosTriggered}
            >
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                <div>{t('sos.button')}</div>
                {isCountingDown && (
                  <div className="text-3xl font-bold mt-2" aria-live="polite">
                    {countdown}
                  </div>
                )}
              </div>
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p>{t('sos.holdInstruction')}</p>
            {isPressed && !isCountingDown && (
              <p className="text-destructive font-medium" aria-live="polite">
                {t('sos.keepHolding')}
              </p>
            )}
            {isCountingDown && (
              <p className="text-destructive font-medium" aria-live="polite">
                {t('sos.releaseToCancel')}
              </p>
            )}
          </div>
        </div>

        {/* Emergency Contact Info */}
        <Card className="p-4">
          <div className="text-center space-y-2">
            <h3 className="font-medium">{t('sos.emergencyContact')}</h3>
            <p className="text-lg font-mono">{emergencyContact}</p>
            <p className="text-xs text-muted-foreground">{t('sos.worksOffline')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};