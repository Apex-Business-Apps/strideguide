import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Phone, MessageSquare, MapPin, Clock, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface EmergencyInterfaceProps {
  onBack?: () => void;
}

const EmergencyInterface: React.FC<EmergencyInterfaceProps> = ({ onBack }) => {
  const [fallDetected, setFallDetected] = React.useState(false);
  const [countdown, setCountdown] = React.useState(30);
  const [emergencyActive, setEmergencyActive] = React.useState(false);
  const [location] = React.useState({ lat: 45.4215, lng: -75.6972 }); // Ottawa
  const [isLongPressing, setIsLongPressing] = React.useState(false);
  const [longPressProgress, setLongPressProgress] = React.useState(0);
  const { toast } = useToast();

  const emergencyContacts: EmergencyContact[] = [
    { id: '1', name: 'Sarah Johnson', phone: '+1-613-555-0123', relationship: 'Daughter' },
    { id: '2', name: 'Dr. Smith Clinic', phone: '+1-613-555-0456', relationship: 'Doctor' },
  ];

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (fallDetected && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setEmergencyActive(true);
            setFallDetected(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [fallDetected, countdown]);

  const simulateFallDetection = () => {
    setFallDetected(true);
    setCountdown(30);
    setEmergencyActive(false);
  };

  const cancelEmergency = () => {
    setFallDetected(false);
    setCountdown(30);
  };

  const triggerManualEmergency = () => {
    setEmergencyActive(true);
    setFallDetected(false);
    toast({
      title: "Emergency Activated",
      description: "Contacting emergency services and sending location...",
      variant: "destructive"
    });
  };

  // SOS Long Press Handlers
  const handleSOSMouseDown = () => {
    setIsLongPressing(true);
    setLongPressProgress(0);
    
    const interval = setInterval(() => {
      setLongPressProgress(prev => {
        const newProgress = prev + (100 / 30); // 3 seconds = 30 * 100ms
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsLongPressing(false);
          setLongPressProgress(0);
          triggerManualEmergency();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    // Haptic feedback pattern during long press
    if (navigator.vibrate) {
      const vibrationPattern = Array(30).fill([50, 50]).flat(); // Rhythmic pattern
      navigator.vibrate(vibrationPattern);
    }

    // Store interval for cleanup
    (window as any).sosInterval = interval;
  };

  const handleSOSMouseUp = () => {
    setIsLongPressing(false);
    setLongPressProgress(0);
    if ((window as any).sosInterval) {
      clearInterval((window as any).sosInterval);
    }
    if (navigator.vibrate) {
      navigator.vibrate(0); // Stop vibration
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Fall Detection Alert */}
      {fallDetected && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Fall Detected!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <p className="text-lg font-medium">
                Emergency services will be contacted in:
              </p>
              <div className="text-3xl font-bold text-destructive">
                {countdown}s
              </div>
              <Progress value={((30 - countdown) / 30) * 100} className="w-full" />
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={cancelEmergency}
              >
                <X className="h-4 w-4 mr-2" />
                I'm OK - Cancel
              </Button>
              <Button
                variant="outline"
                onClick={triggerManualEmergency}
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                Get Help Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Status */}
      {emergencyActive && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Phone className="h-5 w-5" />
              Emergency Active
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="destructive" className="w-full justify-center py-2">
                SMS sent with location
              </Badge>
              <Badge variant="destructive" className="w-full justify-center py-2">
                Calling emergency contact...
              </Badge>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Emergency Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency & Fall Detection
            <Badge variant="secondary" className="ml-auto">
              Sensors Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SOS Long Press Button - Large Touch Target */}
          <div className="relative">
            <Button
              variant="destructive"
              size="lg"
              className="w-full h-20 text-lg font-semibold relative overflow-hidden"
              onMouseDown={handleSOSMouseDown}
              onMouseUp={handleSOSMouseUp}
              onMouseLeave={handleSOSMouseUp}
              onTouchStart={handleSOSMouseDown}
              onTouchEnd={handleSOSMouseUp}
              disabled={emergencyActive}
              aria-label="Emergency SOS - Hold for 3 seconds to activate"
              aria-describedby="sos-instructions"
            >
              <Phone className="h-6 w-6 mr-3" />
              Emergency SOS
              {isLongPressing && (
                <div 
                  className="absolute inset-0 bg-white/20 transition-all duration-100"
                  style={{ width: `${longPressProgress}%` }}
                />
              )}
            </Button>
            <p id="sos-instructions" className="text-xs text-center text-muted-foreground mt-2">
              Hold for 3 seconds to activate emergency protocol
            </p>
          </div>

          {/* Fall Detection Status */}
          <div className="p-4 rounded-lg bg-muted space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Fall Detection</h3>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Using accelerometer + gyroscope fusion with posture analysis
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={simulateFallDetection}
              className="w-full"
            >
              Simulate Fall (Demo)
            </Button>
          </div>

          {/* Emergency Contacts */}
          <div className="space-y-3">
            <h3 className="font-medium">Emergency Contacts</h3>
            {emergencyContacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {contact.relationship} • {contact.phone}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Sensor Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">Motion Sensors</p>
              <p className="text-muted-foreground">Accel + Gyro OK</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">Location</p>
              <p className="text-muted-foreground">GPS Ready</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyInterface;