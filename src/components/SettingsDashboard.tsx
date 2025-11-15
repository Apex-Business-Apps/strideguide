import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { BatteryGuard } from '@/utils/BatteryGuard';
import { HealthManager } from '@/utils/HealthManager';
import { useJourneyTrace } from '@/hooks/useJourneyTrace';
import { DataWipeManager } from '@/utils/DataWipeManager';
import { telemetry } from '@/utils/Telemetry';
import { AdvancedActions } from '@/components/settings/AdvancedActions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Smartphone, 
  Snowflake, 
  Cloud, 
  BarChart3, 
  Eye, 
  Shield,
  Thermometer,
  Battery,
  AlertTriangle
} from 'lucide-react';

interface SettingsDashboardProps {
  onBack?: () => void;
  replayTutorial?: () => void;
}

const SettingsDashboard: React.FC<SettingsDashboardProps> = ({ onBack: _onBack, replayTutorial: _replayTutorial }) => {
  const [lowEndMode, setLowEndMode] = React.useState(false);
  const [winterMode, setWinterMode] = React.useState(false);
  const [cloudDescribe, setCloudDescribe] = React.useState(false);
  const [telemetryOptIn, setTelemetryOptIn] = React.useState(false);
  const [highContrast, setHighContrast] = React.useState(false);
  const [largeTargets, setLargeTargets] = React.useState(true);
  const [healthStatus, setHealthStatus] = React.useState(HealthManager.getStatus());
  const [batteryInfo, setBatteryInfo] = React.useState(BatteryGuard.getBatteryInfo());
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = React.useState(false);
  const [remoteRowCount, setRemoteRowCount] = React.useState(0);
  const [isClearing, setIsClearing] = React.useState(false);
  const { toast } = useToast();

  const _journeyTrace = useJourneyTrace('settings_save', { component: 'SettingsDashboard' });

  // Update health status and battery info
  React.useEffect(() => {
    const unsubscribeHealth = HealthManager.onHealthChange(setHealthStatus);
    const unsubscribeBattery = BatteryGuard.onLowPowerModeChange(() => {
      setBatteryInfo(BatteryGuard.getBatteryInfo());
    });

    // Initialize guards
    BatteryGuard.initialize();

    return () => {
      unsubscribeHealth();
      unsubscribeBattery();
    };
  }, []);

  const deviceStats = {
    thermal: healthStatus.overall === 'critical' ? 'Warning' : 'Normal',
    battery: batteryInfo.level ? `${Math.round(batteryInfo.level * 100)}%` : 'Unknown',
    performance: healthStatus.overall === 'healthy' ? 'Optimal' : 'Degraded',
    storageUsed: '2.1 GB'
  };

  const handleClearAllData = async () => {
    telemetry.track('settings_clear_all_clicked');
    
    // Get remote row count
    const count = await DataWipeManager.getRemoteRowCount();
    setRemoteRowCount(count);
    
    if (count > 0) {
      setShowFinalConfirm(true);
    } else {
      setShowClearDialog(false);
      await executeClearAll();
    }
  };

  const executeClearAll = async () => {
    setIsClearing(true);
    telemetry.track('settings_clear_all_confirmed', { remote_rows: remoteRowCount });
    
    try {
      const startTime = performance.now();
      const result = await DataWipeManager.wipeAllData();
      const duration = Math.round(performance.now() - startTime);
      
      if (result.success) {
        telemetry.track('settings_clear_all_completed', {
          duration_ms: duration,
          local_cleared: result.localCleared,
          remote_deleted: result.remoteDeleted,
          details: result.details,
        });
        
        toast({
          title: 'All data cleared',
          description: `Removed ${result.localCleared} local stores and ${result.remoteDeleted} remote records.`,
        });
        
        // Reset UI state
        setLowEndMode(false);
        setWinterMode(false);
        setCloudDescribe(false);
        setTelemetryOptIn(false);
        setHighContrast(false);
        setLargeTargets(true);
      } else {
        telemetry.track('settings_clear_all_failed', {
          errors: result.errors,
          partial_local: result.localCleared,
          partial_remote: result.remoteDeleted,
        });
        
        toast({
          title: 'Clear partially failed',
          description: `Cleared ${result.localCleared} local stores, ${result.remoteDeleted} remote records. ${result.errors.length} errors occurred.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      telemetry.track('settings_clear_all_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      toast({
        title: 'Clear failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
      setShowFinalConfirm(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          StrideGuide Settings
          <Badge variant="secondary" className="ml-auto">
            v1.0.0
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Settings */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Performance Mode
          </h3>
          
          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="low-end-mode" className="font-medium">
                  Low-End Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reduces processing to 5 FPS / 400px for older devices
                </p>
              </div>
              <Switch
                id="low-end-mode"
                checked={lowEndMode}
                onCheckedChange={setLowEndMode}
                aria-label="Toggle low-end performance mode"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="winter-mode" className="font-medium flex items-center gap-2">
                  <Snowflake className="h-4 w-4" />
                  Winter Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enhanced ice and slip detection with extra warnings
                </p>
              </div>
              <Switch
                id="winter-mode"
                checked={winterMode}
                onCheckedChange={setWinterMode}
                aria-label="Toggle winter mode for enhanced ice detection"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Cloud Features */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Cloud Features
          </h3>
          
          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="cloud-describe" className="font-medium">
                  Scene Description
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI-powered detailed scene descriptions (requires internet)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Disabled in v1
                </Badge>
                <Switch
                  id="cloud-describe"
                  checked={cloudDescribe}
                  onCheckedChange={setCloudDescribe}
                  disabled={true}
                  aria-label="Toggle cloud scene description (disabled in v1)"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Accessibility */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Accessibility
          </h3>
          
          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="high-contrast" className="font-medium">
                  High Contrast UI
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enhanced contrast for better visibility
                </p>
              </div>
              <Switch
                id="high-contrast"
                checked={highContrast}
                onCheckedChange={setHighContrast}
                aria-label="Toggle high contrast user interface"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="large-targets" className="font-medium">
                  Large Touch Targets
                </Label>
                <p className="text-sm text-muted-foreground">
                  Minimum 52dp/pt touch targets for easier interaction
                </p>
              </div>
              <Switch
                id="large-targets"
                checked={largeTargets}
                onCheckedChange={setLargeTargets}
                aria-label="Toggle large touch targets"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Privacy & Telemetry */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy & Data
          </h3>
          
          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="telemetry" className="font-medium">
                  Anonymous Telemetry
                </Label>
                <p className="text-sm text-muted-foreground">
                  Share FPS, thermals, and model performance data
                </p>
              </div>
              <Switch
                id="telemetry"
                checked={telemetryOptIn}
                onCheckedChange={setTelemetryOptIn}
                aria-label="Toggle anonymous telemetry collection"
              />
            </div>
            
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">
                <strong>Privacy Note:</strong> No camera frames or personal data are collected. 
                All processing happens on-device.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowClearDialog(true)}
                aria-label="Clear all data from device and account"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Clear all data
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Removes learned items and settings from this device and your account
              </p>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const data = {
                    settings: { lowEndMode, winterMode, cloudDescribe, telemetryOptIn, highContrast, largeTargets },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `strideguide-settings-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export Settings Data
              </Button>
            </div>

            <Separator className="my-4" />
            
            {/* Advanced Section */}
            <div className="space-y-3 pt-2">
              <h4 className="font-medium text-sm">Advanced</h4>
              <AdvancedActions />
            </div>
          </div>
        </div>

        <Separator />

        {/* Device Status */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Device Status
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <Thermometer className="h-4 w-4" />
                <span className="font-medium">Thermal</span>
              </div>
              <p className="text-sm text-muted-foreground">{deviceStats.thermal}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <Battery className="h-4 w-4" />
                <span className="font-medium">Battery</span>
              </div>
              <p className="text-sm text-muted-foreground">{deviceStats.battery}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="font-medium">Performance</span>
              </div>
              <p className="text-sm text-muted-foreground">{deviceStats.performance}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="h-4 w-4" />
                <span className="font-medium">Storage</span>
              </div>
              <p className="text-sm text-muted-foreground">{deviceStats.storageUsed}</p>
            </div>
          </div>
        </div>

        {/* Confirmation Dialogs */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all learned items, settings, and usage data from:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>This device (local storage, cache)</li>
                  <li>Your account (cloud database)</li>
                </ul>
                <p className="mt-3 font-semibold">This action cannot be undone.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleClearAllData}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showFinalConfirm} onOpenChange={setShowFinalConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Final Confirmation
              </AlertDialogTitle>
              <AlertDialogDescription>
                <p className="mb-2">
                  You have <strong>{remoteRowCount} records</strong> in your account that will be permanently deleted.
                </p>
                <p className="text-sm">
                  Are you absolutely sure you want to proceed?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowClearDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={executeClearAll}
                disabled={isClearing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isClearing ? 'Clearing...' : 'Yes, delete everything'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default SettingsDashboard;