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
import { 
  Settings, 
  Smartphone, 
  Snowflake, 
  Cloud, 
  BarChart3, 
  Eye, 
  Shield,
  Thermometer,
  Battery
} from 'lucide-react';

interface SettingsDashboardProps {
  onBack?: () => void;
  replayTutorial?: () => void;
}

const SettingsDashboard: React.FC<SettingsDashboardProps> = ({ onBack, replayTutorial }) => {
  const [lowEndMode, setLowEndMode] = React.useState(false);
  const [winterMode, setWinterMode] = React.useState(false);
  const [cloudDescribe, setCloudDescribe] = React.useState(false);
  const [telemetryOptIn, setTelemetryOptIn] = React.useState(false);
  const [highContrast, setHighContrast] = React.useState(false);
  const [largeTargets, setLargeTargets] = React.useState(true);
  const [healthStatus, setHealthStatus] = React.useState(HealthManager.getStatus());
  const [batteryInfo, setBatteryInfo] = React.useState(BatteryGuard.getBatteryInfo());
  const { toast } = useToast();
  
  const journeyTrace = useJourneyTrace('settings_save', { component: 'SettingsDashboard' });

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
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    const startTime = performance.now();
                    const { EncryptedKV } = await import('@/crypto/kv');
                    await EncryptedKV.deleteAll();
                    const duration = Math.round(performance.now() - startTime);
                    journeyTrace.complete({ action: 'delete_all', duration_ms: duration });
                    toast({ title: 'All encrypted data deleted' });
                  } catch (error) {
                    console.error('Delete failed:', error);
                    journeyTrace.fail('Delete operation failed');
                    toast({ title: 'Delete failed', variant: 'destructive' });
                  }
                }}
              >
                Delete All Stored Data
              </Button>
              
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

        {/* Actions */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full">
            Export Usage Data
          </Button>
          <Button variant="outline" className="w-full">
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsDashboard;