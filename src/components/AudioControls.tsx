import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Globe, RotateCcw, Headphones } from 'lucide-react';
import { Logger } from '@/utils/Logger';

const AudioControls = () => {
  const [volume, setVolume] = React.useState([75]);
  const [isMuted, setIsMuted] = React.useState(false);
  const [language, setLanguage] = React.useState<'en' | 'fr'>('en');
  const [stereoMode, setStereoMode] = React.useState(true);
  const [lastCue, _setLastCue] = React.useState('Veer left to avoid pothole');

  const handleVolumeChange = (newValue: number[]) => {
    setVolume(newValue);
    if (newValue[0] > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  const repeatLastCue = () => {
    // In real app, this would trigger TTS to repeat the last guidance
    Logger.debug('Repeating:', lastCue);
  };

  const testStereoAudio = () => {
    // In real app, this would play a stereo test tone
    Logger.debug('Testing stereo audio positioning');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Audio & Guidance Controls
          <Badge variant="secondary" className="ml-auto">
            TTS Offline
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="volume-slider" className="font-medium">
              Volume
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
          <Slider
            id="volume-slider"
            value={isMuted ? [0] : volume}
            onValueChange={handleVolumeChange}
            max={100}
            step={5}
            className="w-full"
            aria-label="Audio volume control"
          />
          <p className="text-sm text-muted-foreground text-center">
            {isMuted ? 'Muted' : `${volume[0]}%`}
          </p>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="font-medium">Language / Langue</Label>
              <p className="text-sm text-muted-foreground">
                {language === 'en' ? 'English (Canada)' : 'Français (Canada)'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={toggleLanguage}
            className="min-w-16"
            aria-label={`Switch to ${language === 'en' ? 'French' : 'English'}`}
          >
            {language.toUpperCase()}
          </Button>
        </div>

        {/* Stereo Mode */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            <Headphones className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="stereo-mode" className="font-medium">
                Stereo Positioning
              </Label>
              <p className="text-sm text-muted-foreground">
                Directional audio cues for spatial awareness
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testStereoAudio}
              className="text-xs"
            >
              Test
            </Button>
            <Switch
              id="stereo-mode"
              checked={stereoMode}
              onCheckedChange={setStereoMode}
              aria-label="Toggle stereo positioning mode"
            />
          </div>
        </div>

        {/* Last Cue Repeat */}
        <div className="space-y-3">
          <Label className="font-medium">Last Guidance Cue</Label>
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="flex-1">
              <p className="text-sm font-medium">{lastCue}</p>
              <p className="text-xs text-muted-foreground">
                Press volume buttons to repeat
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={repeatLastCue}
              aria-label="Repeat last guidance cue"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Audio Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium">Audio Engine</p>
            <p className="text-muted-foreground">
              {language === 'en' ? 'EN-CA Voice' : 'FR-CA Voice'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium">Latency</p>
            <p className="text-muted-foreground">~120ms</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioControls;