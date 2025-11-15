import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Bell, 
  Clock, 
  MapPin, 
  Activity,
  Shield,
  TrendingUp,
  Zap,
  ChevronRight,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HazardAlert {
  id: string;
  type: 'obstacle' | 'surface' | 'traffic' | 'weather' | 'construction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: string;
  timestamp: Date;
  isActive: boolean;
  source: 'ai-detection' | 'user-report' | 'system' | 'community';
}

interface SystemNotification {
  id: string;
  type: 'battery' | 'connectivity' | 'update' | 'performance' | 'emergency';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionRequired: boolean;
}

interface HazardNotificationScreenProps {
  onBack: () => void;
}

export const HazardNotificationScreen: React.FC<HazardNotificationScreenProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'hazards' | 'system' | 'analytics'>('hazards');
  const [hazardAlerts, setHazardAlerts] = useState<HazardAlert[]>([
    {
      id: '1',
      type: 'obstacle',
      severity: 'high',
      title: 'Large Pothole Detected',
      description: 'Significant road damage detected ahead. Exercise extreme caution.',
      location: 'Main St & 1st Ave',
      timestamp: new Date(Date.now() - 300000), // 5 mins ago
      isActive: true,
      source: 'ai-detection'
    },
    {
      id: '2',
      type: 'construction',
      severity: 'medium',
      title: 'Construction Zone',
      description: 'Sidewalk construction in progress. Alternative route suggested.',
      location: '2nd Ave (block 100)',
      timestamp: new Date(Date.now() - 1800000), // 30 mins ago
      isActive: true,
      source: 'community'
    },
    {
      id: '3',
      type: 'surface',
      severity: 'low',
      title: 'Wet Surface',
      description: 'Recent rain has made surfaces slippery. Additional caution advised.',
      location: 'Park Path East',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      isActive: true,
      source: 'system'
    }
  ]);

  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([
    {
      id: '1',
      type: 'battery',
      priority: 'high',
      title: 'Low Battery Warning',
      message: 'Device battery is below 20%. Consider charging soon.',
      timestamp: new Date(Date.now() - 600000), // 10 mins ago
      isRead: false,
      actionRequired: true
    },
    {
      id: '2',
      type: 'update',
      priority: 'medium',
      title: 'System Update Available',
      message: 'New features and improvements are ready to install.',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      isRead: false,
      actionRequired: false
    },
    {
      id: '3',
      type: 'performance',
      priority: 'low',
      title: 'Performance Optimized',
      message: 'AI processing has been optimized for better battery life.',
      timestamp: new Date(Date.now() - 10800000), // 3 hours ago
      isRead: true,
      actionRequired: false
    }
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-destructive/80 text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'obstacle': return <AlertTriangle className="h-4 w-4" />;
      case 'construction': return <Settings className="h-4 w-4" />;
      case 'battery': return <Activity className="h-4 w-4" />;
      case 'update': return <TrendingUp className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const markNotificationAsRead = (id: string) => {
    setSystemNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const dismissHazard = (id: string) => {
    setHazardAlerts(prev => 
      prev.map(hazard => 
        hazard.id === id ? { ...hazard, isActive: false } : hazard
      )
    );
    toast({
      title: "Hazard Dismissed",
      description: "This hazard alert has been marked as resolved.",
    });
  };

  const unreadCount = systemNotifications.filter(n => !n.isRead).length;
  const activeHazardCount = hazardAlerts.filter(h => h.isActive).length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="outline" className="min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Safety Command Center</h1>
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              Premium
            </Badge>
          </div>
          <div className="w-20" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeHazardCount}</p>
                  <p className="text-sm text-muted-foreground">Active Hazards</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">Unread Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">24h</p>
                  <p className="text-sm text-muted-foreground">Monitor Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'hazards' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('hazards')}
            className="flex-1"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Hazard Alerts
            {activeHazardCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {activeHazardCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'system' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('system')}
            className="flex-1"
          >
            <Bell className="h-4 w-4 mr-2" />
            System Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('analytics')}
            className="flex-1"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {activeTab === 'hazards' && (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  Environmental Hazards
                </>
              )}
              {activeTab === 'system' && (
                <>
                  <Bell className="h-5 w-5" />
                  System Notifications
                </>
              )}
              {activeTab === 'analytics' && (
                <>
                  <TrendingUp className="h-5 w-5" />
                  Safety Analytics
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {activeTab === 'hazards' && (
                <div className="space-y-4">
                  {hazardAlerts.filter(h => h.isActive).map(hazard => (
                    <div key={hazard.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(hazard.type)}
                            <h3 className="font-semibold">{hazard.title}</h3>
                            <Badge className={getSeverityColor(hazard.severity)}>
                              {hazard.severity}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">{hazard.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {hazard.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(hazard.timestamp)}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {hazard.source}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissHazard(hazard.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                  {hazardAlerts.filter(h => h.isActive).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-lg font-medium">All Clear</p>
                      <p>No active hazard alerts in your area</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-4">
                  {systemNotifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-muted/50' : ''
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(notification.type)}
                            <h3 className="font-semibold">{notification.title}</h3>
                            <Badge className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            )}
                          </div>
                          <p className="text-muted-foreground mb-2">{notification.message}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(notification.timestamp)}
                            </div>
                            {notification.actionRequired && (
                              <Badge variant="outline" className="text-xs">
                                Action Required
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3">Today's Safety Score</h4>
                        <div className="text-3xl font-bold text-green-500 mb-2">92/100</div>
                        <p className="text-sm text-muted-foreground">
                          Excellent safety awareness today
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3">Hazards Avoided</h4>
                        <div className="text-3xl font-bold text-primary mb-2">7</div>
                        <p className="text-sm text-muted-foreground">
                          Potential risks prevented
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-4">Weekly Trends</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Obstacle Detection Rate</span>
                        <span className="text-sm font-medium">↑ 15%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Response Time</span>
                        <span className="text-sm font-medium">↓ 0.3s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">False Positive Rate</span>
                        <span className="text-sm font-medium">↓ 5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};