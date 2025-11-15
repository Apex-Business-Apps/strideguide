import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Search, Volume2, Vibrate } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMLInference } from '@/hooks/useMLInference';
import { SAFETY } from '@/config/safety';

interface LostItemFinderProps {
  onBack?: () => void;
}

const LostItemFinder: React.FC<LostItemFinderProps> = ({ onBack: _onBack }) => {
  const [running, setRunning] = useState(false);
  const [targetEmb, setTargetEmb] = useState<Float32Array | null>(null);
  const [lastHit, setLastHit] = useState<{bbox:[number,number,number,number]; similarity:number}|null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { isInitialized, isLoading, generateEmbedding, searchForItem } = useMLInference();

  const grabImageData = useCallback((): ImageData | null => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return null;
    const w = v.videoWidth | 0;
    const h = v.videoHeight | 0;
    if (!w || !h) return null;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(v, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }, []);

  async function captureTarget() {
    const img = grabImageData();
    if (!img) return;
    const emb = await generateEmbedding(img);
    setTargetEmb(emb);
    toast({ title: "Item learned", description: "Start searching to find it" });
  }

  useEffect(() => {
    let mounted = true;
    let lastTs = 0;
    async function tick(ts: number) {
      if (!mounted || !running) return;
      if (ts - lastTs >= SAFETY.TARGET_FRAME_MS) {
        lastTs = ts;
        const img = grabImageData();
        if (img && targetEmb) {
          const hit = await searchForItem(img, targetEmb);
          setLastHit(hit ? { bbox: hit.bbox, similarity: hit.similarity } : null);
          
          if (hit && audioEnabled && hapticsEnabled && navigator.vibrate) {
            navigator.vibrate(100);
          }
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { mounted = false; };
  }, [running, targetEmb, searchForItem, grabImageData, audioEnabled, hapticsEnabled]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <h3 className="text-lg font-semibold">Loading ML models...</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Lost Item Finder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded" />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="flex gap-2">
          <Button onClick={captureTarget} disabled={!isInitialized}>
            <Camera className="h-4 w-4 mr-2" />
            Teach Item
          </Button>
          <Button 
            onClick={() => setRunning(s => !s)} 
            variant={running ? 'destructive' : 'default'}
            disabled={!targetEmb || !isInitialized}
          >
            <Search className="h-4 w-4 mr-2" />
            {running ? 'Stop' : 'Start'} Finding
          </Button>
        </div>

        <div className="p-4 rounded-lg border">
          {lastHit ? (
            <>
              <p className="font-medium">Match {Math.round(lastHit.similarity*100)}%</p>
              <p className="text-sm text-muted-foreground">
                Position: {JSON.stringify(lastHit.bbox)}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No match yet</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant={audioEnabled ? 'default' : 'outline'}
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="h-12"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Audio {audioEnabled ? 'On' : 'Off'}
          </Button>
          <Button
            variant={hapticsEnabled ? 'default' : 'outline'}
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            className="h-12"
          >
            <Vibrate className="h-4 w-4 mr-2" />
            Haptics {hapticsEnabled ? 'On' : 'Off'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LostItemFinder;