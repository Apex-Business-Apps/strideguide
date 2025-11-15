import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVisionAnalysis, VisionMode } from '@/hooks/useVisionAnalysis';
import { SSMLGenerator, speakSSML } from '@/utils/SSMLGenerator';
import { Eye, EyeOff, Volume2, VolumeX, Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VisionGuidanceProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  autoAnalyzeInterval?: number; // ms, default 3000
}

const VisionGuidance: React.FC<VisionGuidanceProps> = ({ 
  videoRef, 
  isActive,
  autoAnalyzeInterval = 3000 
}) => {
  const { toast } = useToast();
  const { analyzeFrame, isAnalyzing, lastResult } = useVisionAnalysis();
  const [mode, setMode] = useState<VisionMode>('hazard');
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const speakEnhancedDescription = useCallback((description: string, analysisMode: VisionMode) => {
    let ssml: string;

    switch (analysisMode) {
      case 'hazard':
        // Check if hazards detected
        if (description.toLowerCase().includes('clear') || description.toLowerCase().includes('no hazard')) {
          ssml = SSMLGenerator.encouragement(description);
        } else {
          // Determine severity from keywords
          const isHighSeverity = /danger|immediate|critical|steep|fall/i.test(description);
          const isMediumSeverity = /caution|watch|careful|uneven/i.test(description);
          const severity = isHighSeverity ? 'high' : isMediumSeverity ? 'medium' : 'low';

          ssml = SSMLGenerator.hazardAlert('Hazard Detected', description, severity);
        }
        break;

      case 'navigation':
        ssml = SSMLGenerator.navigationInstruction(description);
        break;

      case 'scene':
        ssml = SSMLGenerator.sceneDescription(description);
        break;

      case 'item':
        ssml = SSMLGenerator.createDocument(
          SSMLGenerator.prosody(description, { rate: 'medium' })
        );
        break;

      default:
        ssml = SSMLGenerator.enhance(description);
    }

    speakSSML(ssml, {
      onError: (error) => {
        console.error('Speech error:', error);
        toast({
          title: "Speech Error",
          description: "Unable to speak description",
          variant: "destructive",
        });
      }
    });
  }, [toast]);

  const handleAnalyze = useCallback(async () => {
    if (!videoRef.current || isAnalyzing) return;

    const description = await analyzeFrame(videoRef.current, mode);

    if (description && audioEnabled) {
      speakEnhancedDescription(description, mode);
    }
  }, [videoRef, isAnalyzing, analyzeFrame, mode, audioEnabled, speakEnhancedDescription]);

  // Auto-analyze when active
  useEffect(() => {
    if (!isActive || !isAutoAnalyzing || !videoRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial analysis
    handleAnalyze();

    // Set up interval
    intervalRef.current = setInterval(() => {
      handleAnalyze();
    }, autoAnalyzeInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isAutoAnalyzing, autoAnalyzeInterval, handleAnalyze, videoRef]);

  const toggleAutoAnalyze = () => {
    setIsAutoAnalyzing(prev => !prev);
    toast({
      description: isAutoAnalyzing 
        ? "Continuous vision analysis stopped" 
        : "Continuous vision analysis started",
    });
  };

  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
    if (!audioEnabled) {
      // Stop any ongoing speech
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleManualAnalyze = () => {
    if (!isAutoAnalyzing) {
      handleAnalyze();
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <Card className="p-4 space-y-4 bg-background/95 backdrop-blur">
        {/* Mode Selection */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            size="sm"
            variant={mode === 'hazard' ? 'default' : 'outline'}
            onClick={() => setMode('hazard')}
            className="min-w-fit"
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Hazards
          </Button>
          <Button
            size="sm"
            variant={mode === 'navigation' ? 'default' : 'outline'}
            onClick={() => setMode('navigation')}
            className="min-w-fit"
          >
            Navigation
          </Button>
          <Button
            size="sm"
            variant={mode === 'scene' ? 'default' : 'outline'}
            onClick={() => setMode('scene')}
            className="min-w-fit"
          >
            Scene
          </Button>
          <Button
            size="sm"
            variant={mode === 'item' ? 'default' : 'outline'}
            onClick={() => setMode('item')}
            className="min-w-fit"
          >
            Find Item
          </Button>
        </div>

        {/* Controls */}
        <div className="flex gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isAutoAnalyzing ? 'destructive' : 'default'}
              onClick={toggleAutoAnalyze}
              disabled={!isActive}
            >
              {isAutoAnalyzing ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Stop Auto
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Start Auto
                </>
              )}
            </Button>

            {!isAutoAnalyzing && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualAnalyze}
                disabled={!isActive || isAnalyzing}
              >
                <Camera className="h-4 w-4 mr-1" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze Now'}
              </Button>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleAudio}
          >
            {audioEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Status */}
        <div className="flex gap-2 items-center text-sm">
          {isAutoAnalyzing && (
            <Badge variant="default" className="animate-pulse">
              Auto-analyzing every {autoAnalyzeInterval / 1000}s
            </Badge>
          )}
          {isAnalyzing && (
            <Badge variant="secondary">
              Analyzing...
            </Badge>
          )}
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-1">
                {lastResult.mode}
              </Badge>
              <div className="flex-1">
                <p className="text-sm leading-relaxed">
                  {lastResult.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lastResult.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isActive && (
          <p className="text-xs text-muted-foreground text-center">
            Enable camera guidance to start vision analysis
          </p>
        )}
      </Card>
    </div>
  );
};

export default VisionGuidance;
