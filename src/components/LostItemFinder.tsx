import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, Search, BookOpen, Zap, Lock, Volume2, Vibrate } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioArmer } from '@/utils/AudioArmer';

interface LearnedItem {
  id: string;
  name: string;
  embeddings: number[][];
  createdAt: Date;
  photoCount: number;
}

interface SearchResult {
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  distance: 'very_close' | 'close' | 'medium' | 'far';
  direction: 'left' | 'center' | 'right';
}

interface LostItemFinderProps {
  onBack?: () => void;
}

const LostItemFinder: React.FC<LostItemFinderProps> = ({ onBack }) => {
  const [mode, setMode] = useState<'teach' | 'search' | 'idle'>('idle');
  const [isPremium] = useState(false); // Demo: will be connected to actual subscription state
  const [isNightMode, setIsNightMode] = useState(false);
  const [learnedItems, setLearnedItems] = useState<LearnedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [teachProgress, setTeachProgress] = useState(0);
  const [currentSearchResult, setCurrentSearchResult] = useState<SearchResult | null>(null);
  const [fps, setFps] = useState(8);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Enhanced ML processing with embeddings simulation
  const processFrame = async () => {
    if (!selectedItem || mode !== 'search') return;
    
    setIsProcessing(true);
    
    // Simulate ML inference delay (targeting <120ms requirement)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 40));
    
    // Simulate detection with better accuracy near center
    const hasDetection = Math.random() > 0.65; // Improved detection rate
    
    if (hasDetection) {
      // Simulate more realistic detection patterns
      const centerWeight = Math.random();
      const xPos = centerWeight > 0.7 ? 0.4 + Math.random() * 0.2 : Math.random();
      
      const result: SearchResult = {
        confidence: 0.7 + Math.random() * 0.25,
        boundingBox: {
          x: xPos,
          y: Math.random() * 0.6,
          width: 0.15 + Math.random() * 0.15,
          height: 0.15 + Math.random() * 0.15,
        },
        distance: getDistanceFromPosition(xPos),
        direction: getDirectionFromPosition(xPos),
      };
      
      setCurrentSearchResult(result);
      
      // Enhanced audio guidance with stereo panning
      if (audioEnabled) {
        playEnhancedAudioGuidance(result);
      }
      
      // Platform-specific haptic feedback
      if (hapticsEnabled) {
        playPlatformHaptics(result);
      }

      // Announce successful detection for higher confidence
      if (result.confidence > 0.85 && AudioArmer.isArmed()) {
        const item = learnedItems.find(i => i.id === selectedItem);
        AudioArmer.announceText(`Found ${item?.name || 'item'}`);
      }
    } else {
      setCurrentSearchResult(null);
    }
    
    setIsProcessing(false);
  };

  const getDistanceFromPosition = (xPos: number): SearchResult['distance'] => {
    if (xPos >= 0.4 && xPos <= 0.6) return 'very_close';
    if (xPos >= 0.3 && xPos <= 0.7) return 'close';
    if (xPos >= 0.2 && xPos <= 0.8) return 'medium';
    return 'far';
  };

  const getDirectionFromPosition = (xPos: number): SearchResult['direction'] => {
    if (xPos < 0.4) return 'left';
    if (xPos > 0.6) return 'right';
    return 'center';
  };

  const playEnhancedAudioGuidance = (result: SearchResult) => {
    // Use AudioArmer for stereo earcons
    const panValue = result.direction === 'left' ? -0.8 : result.direction === 'right' ? 0.8 : 0;
    const intensity = result.distance === 'very_close' ? 1 : 
                     result.distance === 'close' ? 0.7 : 
                     result.distance === 'medium' ? 0.4 : 0.2;
    
    if (AudioArmer.isArmed()) {
      AudioArmer.playDirectionalCue(result.direction, intensity);
    }
    
    // Occasional voice guidance
    if (Math.random() > 0.8) {
      const utterance = new SpeechSynthesisUtterance(
        getDirectionText(result.direction, result.distance)
      );
      utterance.lang = 'en-CA';
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const playPlatformHaptics = (result: SearchResult) => {
    // Android gets vibration, iOS gets enhanced audio earcons
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isAndroid && navigator.vibrate) {
      const pattern = getHapticPattern(result.distance);
      navigator.vibrate(pattern);
    }
  };

  const getDirectionText = (direction: string, distance: string) => {
    const directionMap = {
      left: 'Turn left',
      right: 'Turn right',
      center: 'Straight ahead'
    };
    
    const distanceMap = {
      very_close: 'Very close',
      close: 'Close',
      medium: 'Getting warmer',
      far: 'Keep searching'
    };
    
    return `${directionMap[direction as keyof typeof directionMap]}. ${distanceMap[distance as keyof typeof distanceMap]}.`;
  };

  const getHapticPattern = (distance: string): number[] => {
    switch (distance) {
      case 'very_close': return [100, 50, 100, 50, 100]; // Rapid pulses
      case 'close': return [150, 100, 150]; // Medium pulses
      case 'medium': return [200, 200, 200]; // Slow pulses
      case 'far': return [300]; // Single long pulse
      default: return [100];
    }
  };

  const startTeaching = () => {
    if (!isPremium && learnedItems.length >= 1) {
      toast({
        title: "Feature Locked",
        description: "Free users can teach 1 item. Upgrade for unlimited items.",
        variant: "destructive"
      });
      return;
    }
    
    setMode('teach');
    setTeachProgress(0);
    // Start camera capture simulation
  };

  const startSearching = (itemId: string) => {
    setSelectedItem(itemId);
    setMode('search');
    setCurrentSearchResult(null);
    
    // Announce search start
    const item = learnedItems.find(i => i.id === itemId);
    if (AudioArmer.isArmed() && item) {
      AudioArmer.announceText(`Searching for ${item.name}`);
    }
    
    // Start frame processing loop at target 8fps
    const processLoop = setInterval(processFrame, 1000 / fps);
    
    // Cleanup after 60 seconds for battery preservation
    setTimeout(() => {
      clearInterval(processLoop);
      setMode('idle');
      setSelectedItem(null);
      if (AudioArmer.isArmed()) {
        AudioArmer.announceText('Search stopped');
      }
    }, 60000);
  };

  const handleNightModeToggle = () => {
    if (!isPremium) {
      toast({
        title: "Night Mode Locked",
        description: "Night mode requires Premium subscription",
        variant: "destructive"
      });
      return;
    }
    setIsNightMode(!isNightMode);
  };

  // Demo: Add sample learned items with realistic embeddings simulation
  useEffect(() => {
    if (learnedItems.length === 0) {
      // Create sample embeddings (would be real 512-dim vectors in production)
      const sampleEmbeddings = Array.from({ length: 12 }, () => 
        Array.from({ length: 128 }, () => Math.random() * 2 - 1)
      );
      
      setLearnedItems([{
        id: '1',
        name: 'My Keys',
        embeddings: sampleEmbeddings,
        createdAt: new Date(),
        photoCount: 12
      }]);
    }
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success text-success-foreground';
    if (confidence >= 0.6) return 'bg-warning text-warning-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  const getDistanceColor = (distance: string) => {
    switch (distance) {
      case 'very_close': return 'bg-success text-success-foreground';
      case 'close': return 'bg-primary text-primary-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'far': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Lost Item Finder
          {mode === 'search' && (
            <Badge variant="secondary" className="ml-auto">
              <Zap className="h-3 w-3 mr-1" />
              {fps} FPS
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Controls - Large Touch Targets */}
        <div className="grid grid-cols-1 gap-4">
          {/* Teach New Item */}
          <Button
            size="lg"
            variant={mode === 'teach' ? 'destructive' : 'default'}
            onClick={startTeaching}
            disabled={mode === 'search'}
            className="h-16 text-lg font-semibold"
            aria-label="Teach the app to recognize a new item by taking photos"
            aria-describedby="teach-status"
          >
            <BookOpen className="h-6 w-6 mr-3" />
            {mode === 'teach' ? 'Teaching...' : 'Teach New Item'}
            {!isPremium && learnedItems.length >= 1 && (
              <Lock className="h-4 w-4 ml-2" />
            )}
          </Button>

          {/* Night Mode Toggle */}
          <Button
            size="lg"
            variant="outline"
            onClick={handleNightModeToggle}
            disabled={mode === 'teach' || mode === 'search'}
            className="h-14 text-base"
            aria-label={`Switch to ${isNightMode ? 'day' : 'night'} mode for better low-light detection`}
          >
            {!isPremium && <Lock className="h-4 w-4 mr-2" />}
            <Camera className="h-5 w-5 mr-2" />
            {isNightMode ? 'Day Mode' : `Night Mode ${!isPremium ? '(Premium)' : ''}`}
          </Button>
        </div>

        {/* Teaching Progress */}
        {mode === 'teach' && (
          <div className="p-4 rounded-lg bg-muted space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Teaching Progress</span>
              <span className="text-sm text-muted-foreground">{teachProgress}/12 photos</span>
            </div>
            <Progress value={(teachProgress / 12) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Take photos from different angles and lighting conditions
            </p>
          </div>
        )}

        {/* Search Results */}
        {mode === 'search' && currentSearchResult && (
          <div className="p-4 rounded-lg border border-primary bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-primary">Item Detected!</h3>
              <Badge className={getConfidenceColor(currentSearchResult.confidence)}>
                {(currentSearchResult.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {currentSearchResult.direction}
              </Badge>
              <Badge className={getDistanceColor(currentSearchResult.distance)}>
                {currentSearchResult.distance.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {getDirectionText(currentSearchResult.direction, currentSearchResult.distance)}
            </p>
          </div>
        )}

        {/* Learned Items */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Learned Items ({learnedItems.length}{!isPremium ? '/1' : ''})
          </h3>
          {learnedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
              No items learned yet. Teach your first item to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {learnedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.photoCount} photos • {item.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startSearching(item.id)}
                    disabled={mode !== 'idle'}
                    className="min-w-[80px]"
                    aria-label={`Start searching for ${item.name}`}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    {selectedItem === item.id && mode === 'search' ? 'Searching...' : 'Find'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audio & Haptic Controls */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant={audioEnabled ? 'default' : 'outline'}
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="h-12"
            aria-label="Toggle audio guidance"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Audio {audioEnabled ? 'On' : 'Off'}
          </Button>
          <Button
            variant={hapticsEnabled ? 'default' : 'outline'}
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            className="h-12"
            aria-label="Toggle haptic feedback"
          >
            <Vibrate className="h-4 w-4 mr-2" />
            Haptics {hapticsEnabled ? 'On' : 'Off'}
          </Button>
        </div>

        {/* Status Display */}
        <div className="p-4 rounded-lg bg-muted space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${mode === 'search' ? 'bg-green-500' : mode === 'teach' ? 'bg-orange-500' : 'bg-gray-400'}`} />
              <span className="font-medium">
                {mode === 'search' ? 'Searching Active' : mode === 'teach' ? 'Teaching Mode' : 'Ready'}
              </span>
            </div>
            {mode === 'search' && (
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                {fps} FPS
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Mode: {isNightMode ? 'Night mode (low-light enhanced)' : 'Day mode'}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium">ML Model</p>
            <p className="text-muted-foreground">MobileNet-SSD + Embedding</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium">Processing</p>
            <p className="text-muted-foreground">On-device @ {fps}fps</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LostItemFinder;