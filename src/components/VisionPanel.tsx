import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, AlertTriangle, Eye, Activity, Moon, Sun, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DetectedHazard {
  id: string;
  type: string;
  position: 'left' | 'center' | 'right';
  distance: 'near' | 'mid' | 'far';
  confidence: number;
}

interface VisionPanelProps {
  onBack?: () => void;
}

const VisionPanel: React.FC<VisionPanelProps> = ({ onBack }) => {
  const [isActive, setIsActive] = React.useState(false);
  const [isNightMode, setIsNightMode] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);
  const [fps, setFps] = React.useState(10);
  const [detectedHazards] = React.useState<DetectedHazard[]>([
    { id: '1', type: 'pothole', position: 'center', distance: 'near', confidence: 0.89 },
    { id: '2', type: 'curb_up', position: 'right', distance: 'mid', confidence: 0.76 },
  ]);
  const { toast } = useToast();

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'left': return 'bg-warning text-warning-foreground';
      case 'center': return 'bg-destructive text-destructive-foreground';
      case 'right': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getDistanceColor = (distance: string) => {
    switch (distance) {
      case 'near': return 'bg-destructive text-destructive-foreground';
      case 'mid': return 'bg-warning text-warning-foreground';
      case 'far': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleNightModeToggle = () => {
    if (!isPremium) {
      // Simulate TTS announcement
      toast({
        title: "Night Mode Locked",
        description: "Night mode requires Premium subscription",
        variant: "destructive"
      });
      return;
    }
    setIsNightMode(!isNightMode);
  };

  const handleGuidanceToggle = () => {
    setIsActive(!isActive);
    // Simulate haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50); // Short confirmation haptic
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Vision Control Panel
          {isActive && (
            <Badge variant="secondary" className="ml-auto">
              <Activity className="h-3 w-3 mr-1" />
              {fps} FPS
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Controls - Large Touch Targets (≥52dp/pt) */}
        <div className="grid grid-cols-1 gap-4">
          {/* Start/Stop Guidance - Primary Control */}
          <Button
            size="lg"
            variant={isActive ? 'destructive' : 'default'}
            onClick={handleGuidanceToggle}
            className="h-16 text-lg font-semibold"
            aria-label={isActive ? 'Stop guidance and camera processing' : 'Start guidance and camera processing'}
            aria-describedby="guidance-status"
          >
            <Camera className="h-6 w-6 mr-3" />
            {isActive ? 'Stop Guidance' : 'Start Guidance'}
          </Button>
          
          {/* Mode Toggle - Day/Night */}
          <Button
            size="lg"
            variant="outline"
            onClick={handleNightModeToggle}
            className="h-14 text-base"
            disabled={!isPremium && !isNightMode}
            aria-label={`Switch to ${isNightMode ? 'day' : 'night'} mode`}
            aria-describedby="mode-status"
          >
            {isNightMode ? (
              <>
                <Sun className="h-5 w-5 mr-2" />
                Day Mode
              </>
            ) : (
              <>
                {!isPremium && <Lock className="h-4 w-4 mr-2" />}
                <Moon className="h-5 w-5 mr-2" />
                Night Mode {!isPremium && '(Premium)'}
              </>
            )}
          </Button>
        </div>

        {/* Status Display */}
        <div className="p-4 rounded-lg bg-muted space-y-2">
          <div className="flex items-center justify-between">
            <div id="guidance-status" className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="font-medium">
                {isActive ? 'Guidance Active' : 'Guidance Inactive'}
              </span>
            </div>
            {isActive && (
              <Badge variant="secondary" className="gap-1">
                <Activity className="h-3 w-3" />
                {fps} FPS
              </Badge>
            )}
          </div>
          <div id="mode-status" className="text-sm text-muted-foreground">
            Current mode: {isNightMode ? 'Night mode (low-light enhanced)' : 'Day mode'}
          </div>
        </div>

        {/* Demo Controls */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPremium(!isPremium)}
            className="flex-1"
          >
            Demo: {isPremium ? 'Free User' : 'Premium User'}
          </Button>
        </div>

        {/* Detected Hazards */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Detected Hazards
          </h3>
          {detectedHazards.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
              No hazards detected
            </p>
          ) : (
            <div className="space-y-2">
              {detectedHazards.map((hazard) => (
                <div key={hazard.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{hazard.type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {(hazard.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPositionColor(hazard.position)}>
                      {hazard.position}
                    </Badge>
                    <Badge className={getDistanceColor(hazard.distance)}>
                      {hazard.distance}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium">Model Version</p>
            <p className="text-muted-foreground">YOLO-nano v1.2</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium">Processing</p>
            <p className="text-muted-foreground">800px @ {fps}fps</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VisionPanel;