import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Monitor, MonitorOff } from 'lucide-react';
import { WakeLockManager } from '@/utils/WakeLockManager';
import { useTranslation } from 'react-i18next';

export const WakeLockIndicator: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Check support
    setIsSupported(WakeLockManager.isSupported());
    
    // Initial state
    setIsActive(WakeLockManager.isActive());
    
    // Poll for wake lock status (since there's no native event)
    const interval = setInterval(() => {
      setIsActive(WakeLockManager.isActive());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isSupported) {
    return null;
  }

  return (
    <Badge 
      variant={isActive ? "default" : "outline"} 
      className="flex items-center gap-1 text-xs"
    >
      {isActive ? (
        <>
          <Monitor className="h-3 w-3" />
          {t('wakeLock.active', 'Screen awake')}
        </>
      ) : (
        <>
          <MonitorOff className="h-3 w-3" />
          {t('wakeLock.inactive', 'Screen may dim')}
        </>
      )}
    </Badge>
  );
};