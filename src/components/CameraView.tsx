import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, AlertTriangle } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useJourneyTrace } from '@/hooks/useJourneyTrace';

interface CameraViewProps {
  onFrame?: (imageData: ImageData) => void;
  isActive: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const CameraView: React.FC<CameraViewProps> = ({ 
  onFrame, 
  isActive, 
  className = '',
  children 
}) => {
  const [fps, setFps] = useState(0);
  const fpsCounterRef = useRef(0);
  const lastFpsUpdate = useRef(Date.now());
  
  const camera = useCamera({
    width: 640,
    height: 480,
    facingMode: 'environment',
    frameRate: 10
  });

  // Track guidance journey
  const journeyTrace = useJourneyTrace('start_guidance', { 
    camera: 'environment',
    resolution: '640x480'
  });

  // Start/stop camera based on isActive prop
  useEffect(() => {
    if (isActive && !camera.isActive) {
      camera.startCamera();
    } else if (!isActive && camera.isActive) {
      camera.stopCamera();
      journeyTrace.complete({ fps_avg: fps });
    }
  }, [isActive, camera, fps, journeyTrace]);

  // Track errors
  useEffect(() => {
    if (camera.error) {
      journeyTrace.fail(camera.error);
    }
  }, [camera.error, journeyTrace]);

  // Handle frame processing
  useEffect(() => {
    if (isActive && camera.isActive && onFrame) {
      camera.startFrameProcessing((imageData) => {
        onFrame(imageData);
        
        // Update FPS counter
        fpsCounterRef.current++;
        const now = Date.now();
        if (now - lastFpsUpdate.current >= 1000) {
          setFps(fpsCounterRef.current);
          fpsCounterRef.current = 0;
          lastFpsUpdate.current = now;
        }
      }, 8); // Target 8 FPS for good balance

      return () => camera.stopFrameProcessing();
    }
  }, [isActive, camera.isActive, onFrame, camera]);

  if (!camera.isSupported) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-warning" />
          <h3 className="text-lg font-semibold">Camera Not Supported</h3>
          <p className="text-muted-foreground">
            This browser doesn't support camera access. Please use a modern browser 
            like Chrome, Safari, or Firefox.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (camera.error) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6 text-center space-y-4">
          <CameraOff className="h-12 w-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Camera Access Denied</h3>
          <p className="text-muted-foreground mb-4">
            {camera.error}
          </p>
          <Button 
            onClick={() => camera.startCamera()}
            variant="outline"
          >
            <Camera className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative ${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* Camera Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              camera.isActive ? 'bg-success animate-pulse' : 'bg-muted'
            }`} />
            <span className="text-sm font-medium">
              {camera.isActive ? 'Camera Active' : 'Camera Inactive'}
            </span>
          </div>
          
          {camera.isActive && (
            <Badge variant="secondary">
              {fps} FPS
            </Badge>
          )}
        </div>

        {/* Camera Feed Visualization */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {camera.isActive ? (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Camera className="h-8 w-8 mx-auto text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">
                  Camera processing active
                </p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <CameraOff className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Camera inactive
                </p>
              </div>
            </div>
          )}
          
          {/* Overlay content */}
          {children}
        </div>

        {/* Processing Status */}
        {camera.isActive && (
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>On-device ML processing</span>
            <span>No data leaves device</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};