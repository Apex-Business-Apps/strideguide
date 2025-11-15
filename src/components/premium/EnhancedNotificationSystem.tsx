import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Bell, 
  Info, 
  CheckCircle, 
  X, 
  Volume2, 
  VolumeX,
  Pause,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface NotificationSystemProps {
  isVisible: boolean;
  notifications: EnhancedNotification[];
  onNotificationDismiss: (id: string) => void;
  onNotificationAcknowledge: (id: string) => void;
  onSystemMute: () => void;
  onSystemPause: () => void;
  isMuted: boolean;
  isPaused: boolean;
  isPremium: boolean;
}

export const EnhancedNotificationSystem: React.FC<NotificationSystemProps> = ({
  isVisible,
  notifications,
  onNotificationDismiss,
  onNotificationAcknowledge,
  _onSystemMute,
  onSystemPause,
  isMuted,
  isPaused,
  isPremium,
}) => {
  const { toast: _toast } = useToast();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [groupedNotifications, setGroupedNotifications] = useState<{
    critical: EnhancedNotification[];
    warning: EnhancedNotification[];
    info: EnhancedNotification[];
    success: EnhancedNotification[];
  }>({
    critical: [],
    warning: [],
    info: [],
    success: []
  });

  // Group notifications by type
  useEffect(() => {
    const activeNotifications = notifications.filter(n => !n.dismissed);
    setGroupedNotifications({
      critical: activeNotifications.filter(n => n.type === 'critical'),
      warning: activeNotifications.filter(n => n.type === 'warning'),
      info: activeNotifications.filter(n => n.type === 'info'),
      success: activeNotifications.filter(n => n.type === 'success'),
    });
  }, [notifications]);

  // Smart notification prioritization for premium users
  const getPriorityOrder = useCallback((notifications: EnhancedNotification[]) => {
    if (!isPremium) return notifications;

    return [...notifications].sort((a, b) => {
      // Critical safety notifications first
      if (a.category === 'safety' && b.category !== 'safety') return -1;
      if (b.category === 'safety' && a.category !== 'safety') return 1;
      
      // Then by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by timestamp (newest first)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [isPremium]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getNotificationClass = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-destructive bg-destructive/5 shadow-lg shadow-destructive/20';
      case 'warning':
        return 'border-warning bg-warning/5 shadow-lg shadow-warning/20';
      case 'success':
        return 'border-green-500 bg-green-500/5 shadow-lg shadow-green-500/20';
      default:
        return 'border-primary bg-primary/5 shadow-lg shadow-primary/20';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 30) return 'Just now';
    if (minutes < 1) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleAcknowledge = (notification: EnhancedNotification) => {
    onNotificationAcknowledge(notification.id);
    
    if (isPremium && notification.hasAudio && soundEnabled && !isMuted) {
      // Play acknowledgment sound for premium users
      const audio = new Audio('/sounds/acknowledge.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback for browsers that block autoplay
        console.log('Audio acknowledgment blocked');
      });
    }
  };

  const handleDismiss = (notification: EnhancedNotification) => {
    onNotificationDismiss(notification.id);
  };

  const renderNotificationGroup = (type: keyof typeof groupedNotifications, title: string) => {
    const notificationList = getPriorityOrder(groupedNotifications[type]);
    
    if (notificationList.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title} ({notificationList.length})
          </h3>
          {isPremium && notificationList.length > 3 && (
            <Button variant="ghost" size="sm" className="text-xs">
              Show All
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          {notificationList.slice(0, isPremium ? 10 : 3).map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${getNotificationClass(notification.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm leading-tight">
                          {notification.title}
                        </h4>
                        {isPremium && (
                          <Badge variant="outline" className="text-xs">
                            {notification.category}
                          </Badge>
                        )}
                        {notification.isContextual && isPremium && (
                          <Badge variant="secondary" className="text-xs">
                            Contextual
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTimeAgo(notification.timestamp)}</span>
                          {notification.location && (
                            <span>• {notification.location}</span>
                          )}
                          {notification.hasAudio && (
                            <span className="flex items-center gap-1">
                              • <Volume2 className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {notification.requiresAcknowledgment && !notification.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledge(notification)}
                              className="h-7 px-2 text-xs"
                            >
                              Acknowledge
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismiss(notification)}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isVisible || (!isPremium && notifications.length === 0)) {
    return null;
  }

  const totalNotifications = Object.values(groupedNotifications).reduce(
    (sum, group) => sum + group.length, 0
  );

  return (
    <div className="fixed top-4 right-4 w-96 max-h-[80vh] z-50">
      <div className="bg-background border rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">
                Safety Notifications
                {isPremium && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Enhanced
                  </Badge>
                )}
              </h2>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 p-0"
                title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              
              {isPremium && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSystemPause}
                  className="h-8 w-8 p-0"
                  title={isPaused ? 'Resume notifications' : 'Pause notifications'}
                >
                  {isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {totalNotifications > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {totalNotifications} active notification{totalNotifications !== 1 ? 's' : ''}
              {isPaused && ' (paused)'}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-6">
          {isPaused ? (
            <div className="text-center py-8 text-muted-foreground">
              <Pause className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium">Notifications Paused</p>
              <p className="text-sm">Click play to resume receiving alerts</p>
            </div>
          ) : totalNotifications === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">All Clear</p>
              <p className="text-sm">No active notifications</p>
            </div>
          ) : (
            <>
              {renderNotificationGroup('critical', 'Critical Alerts')}
              {renderNotificationGroup('warning', 'Warnings')}
              {renderNotificationGroup('info', 'Information')}
              {renderNotificationGroup('success', 'Success')}
            </>
          )}
        </div>
      </div>
    </div>
  );
};