import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  BookOpen,
  Volume2,
  VolumeX,
  Vibrate,
  Lock,
  Trash2,
  Moon,
  Sun,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLostItemFinder } from '@/hooks/useLostItemFinder';
import { useMLInference } from '@/hooks/useMLInference';
import { useAudioGuidance } from '@/hooks/useAudioGuidance';
import { CameraView } from './CameraView';

interface Props {
  isPremium?: boolean;
  currentLang?: 'en' | 'fr';
  onBack: () => void;
}

export const EnhancedLostItemFinder: React.FC<Props> = ({ 
  isPremium = false,
  currentLang = 'en',
  onBack
}) => {
  const { toast } = useToast();
  const [isNightMode, setIsNightMode] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [currentItem, setCurrentItem] = useState<string>('');
  
  const {
    learnedItems,
    isTeaching,
    isSearching,
    teachProgress,
    currentSearchResult,
    startTeaching,
    startSearching,
    stopSearching,
    deleteLearnedItem,
    updateSettings: _updateSettings
  } = useLostItemFinder();

  const mode = isTeaching ? 'teach' : isSearching ? 'search' : 'idle';

  const { isLoading: isMLLoading, error: mlError } = useMLInference();

  const audioGuidance = useAudioGuidance({
    enabled: audioEnabled,
    volume: 0.8,
    spatialAudio: true
  });

  // REAL ML processing - removed simulated detection
  const handleCameraFrame = useCallback(async (_imageData: ImageData) => {
    // Real ML integrated through useLostItemFinder hook
    if (currentSearchResult && audioEnabled) {
      audioGuidance.playDirectionalTone(currentSearchResult.direction, currentSearchResult.confidence);
    }
  }, [currentSearchResult, audioEnabled, audioGuidance]);

  const handleStartTeaching = () => {
    if (!isPremium && learnedItems.length >= 1) {
      toast({
        title: currentLang === 'fr' ? 'Fonctionnalité verrouillée' : 'Feature Locked',
        description: currentLang === 'fr' 
          ? 'Les utilisateurs gratuits peuvent enseigner 1 élément. Mettez à niveau pour des éléments illimités.'
          : 'Free users can teach 1 item. Upgrade for unlimited items.',
        variant: 'destructive'
      });
      return;
    }

    if (!currentItem.trim()) {
      toast({
        title: 'Item Name Required',
        description: 'Please enter a name for the item you want to teach.',
        variant: 'destructive'
      });
      return;
    }

    startTeaching(currentItem);
    setCurrentItem('');
  };

  const handleNightModeToggle = () => {
    if (!isPremium) {
      toast({
        title: 'Night Mode Locked',
        description: 'Night mode requires Premium subscription',
        variant: 'destructive'
      });
      return;
    }
    setIsNightMode(!isNightMode);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success text-success-foreground';
    if (confidence >= 0.6) return 'bg-warning text-warning-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  const getDistanceDescription = (distance: 'very_close' | 'close' | 'medium' | 'far') => {
    const descriptions = {
      very_close: currentLang === 'fr' ? 'Très proche' : 'Very close',
      close: currentLang === 'fr' ? 'Proche' : 'Close',
      medium: currentLang === 'fr' ? 'Moyen' : 'Medium',
      far: currentLang === 'fr' ? 'Loin' : 'Far'
    };
    return descriptions[distance];
  };

  const getDirectionDescription = (direction: 'left' | 'center' | 'right') => {
    const directions = {
      left: currentLang === 'fr' ? 'Gauche' : 'Left',
      center: currentLang === 'fr' ? 'Centre' : 'Center', 
      right: currentLang === 'fr' ? 'Droite' : 'Right'
    };
    return directions[direction];
  };

  // Show ML loading state
  if (isMLLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <h3 className="text-lg font-semibold">Initializing ML Models</h3>
          <p className="text-muted-foreground">
            Loading on-device vision models for lost item detection...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show ML error state
  if (mlError) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to initialize ML models: {mlError}
              <br />
              Please refresh the page to try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="min-h-[44px]"
            aria-label="Back to home"
          >
            <Search className="h-5 w-5 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">
            {currentLang === 'fr' ? 'Chercheur d\'objets perdus' : 'Lost Item Finder'}
          </h1>
          <div className="w-20" />
        </div>
        
        <div className="w-full max-w-4xl space-y-6">
      {/* Main Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {currentLang === 'fr' ? 'Chercheur d\'objets perdus' : 'Lost Item Finder'}
            {mode === 'search' && (
              <Badge variant="secondary" className="ml-auto">
                <Zap className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teaching Interface */}
          {mode === 'idle' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  placeholder={currentLang === 'fr' ? 'Nom de l\'objet...' : 'Item name...'}
                  className="flex-1 px-3 py-2 border rounded-md"
                  onKeyPress={(e) => e.key === 'Enter' && handleStartTeaching()}
                />
                <Button 
                  onClick={handleStartTeaching}
                  disabled={!currentItem.trim()}
                  size="lg"
                  className="min-w-[120px]"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {currentLang === 'fr' ? 'Enseigner' : 'Teach'}
                  {!isPremium && learnedItems.length >= 1 && (
                    <Lock className="h-4 w-4 ml-2" />
                  )}
                </Button>
              </div>

              <Button
                size="lg"
                variant="outline"
                onClick={handleNightModeToggle}
                className="w-full h-14"
                aria-label="Toggle night mode"
              >
                {!isPremium && <Lock className="h-4 w-4 mr-2" />}
                {isNightMode ? <Sun className="h-5 w-5 mr-2" /> : <Moon className="h-5 w-5 mr-2" />}
                {isNightMode 
                  ? (currentLang === 'fr' ? 'Mode jour' : 'Day Mode')
                  : `${currentLang === 'fr' ? 'Mode nuit' : 'Night Mode'} ${!isPremium ? '(Premium)' : ''}`
                }
              </Button>
            </div>
          )}

          {/* Teaching Progress */}
          {mode === 'teach' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {currentLang === 'fr' ? 'Progression d\'enseignement' : 'Teaching Progress'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.floor((teachProgress / 100) * 12)}/12 photos
                  </span>
                </div>
                <Progress value={teachProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {currentLang === 'fr' 
                    ? 'Prenez des photos sous différents angles et conditions d\'éclairage'
                    : 'Take photos from different angles and lighting conditions'
                  }
                </p>
              </div>
              
              <Button 
                onClick={stopSearching}
                variant="destructive"
                size="lg"
                className="w-full"
              >
                {currentLang === 'fr' ? 'Arrêter l\'enseignement' : 'Stop Teaching'}
              </Button>
            </div>
          )}

          {/* Search Results */}
          {mode === 'search' && currentSearchResult && (
            <div className="p-4 rounded-lg border border-primary bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-primary">
                  {currentLang === 'fr' ? 'Objet détecté!' : 'Item Detected!'}
                </h3>
                <Badge className={getConfidenceColor(currentSearchResult.confidence)}>
                  {(currentSearchResult.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {getDirectionDescription(currentSearchResult.direction)}
                </Badge>
                <Badge variant="secondary">
                  {getDistanceDescription(currentSearchResult.distance)}
                </Badge>
              </div>
            </div>
          )}

          {/* Search Mode Controls */}
          {mode === 'search' && (
            <Button 
              onClick={stopSearching}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {currentLang === 'fr' ? 'Arrêter la recherche' : 'Stop Searching'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Camera View */}
      <CameraView
        isActive={mode !== 'idle'}
        onFrame={handleCameraFrame}
        className="w-full"
      >
        {/* Camera overlay content */}
        {currentSearchResult && (
          <div 
            className="absolute border-2 border-primary bg-primary/20 rounded"
            style={{
              left: `${currentSearchResult.boundingBox.x * 100}%`,
              top: `${currentSearchResult.boundingBox.y * 100}%`,
              width: `${currentSearchResult.boundingBox.width * 100}%`,
              height: `${currentSearchResult.boundingBox.height * 100}%`,
            }}
          />
        )}
      </CameraView>

      {/* Learned Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {currentLang === 'fr' ? 'Objets appris' : 'Learned Items'} 
            ({learnedItems.length}{!isPremium ? '/1' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {learnedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
              {currentLang === 'fr' 
                ? 'Aucun objet appris pour le moment. Enseignez votre premier objet pour commencer.'
                : 'No items learned yet. Teach your first item to get started.'
              }
            </p>
          ) : (
            <div className="space-y-3">
              {learnedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.photoCount} photos • {item.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => startSearching(item.id)}
                      disabled={mode !== 'idle'}
                      className="min-w-[80px]"
                    >
                      <Search className="h-4 w-4 mr-1" />
                      {currentLang === 'fr' ? 'Chercher' : 'Find'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteLearnedItem(item.id)}
                      disabled={mode !== 'idle'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio & Haptic Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={audioEnabled ? 'default' : 'outline'}
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="h-12"
              aria-label="Toggle audio guidance"
            >
              {audioEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
              {currentLang === 'fr' ? 'Audio' : 'Audio'} {audioEnabled ? 'On' : 'Off'}
            </Button>
            <Button
              variant={hapticsEnabled ? 'default' : 'outline'}
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              className="h-12"
              aria-label="Toggle haptic feedback"
            >
              <Vibrate className="h-4 w-4 mr-2" />
              {currentLang === 'fr' ? 'Haptique' : 'Haptics'} {hapticsEnabled ? 'On' : 'Off'}
            </Button>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
};