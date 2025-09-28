import { useState, useEffect, useRef, useCallback } from 'react';

export interface CameraConfig {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  frameRate: number;
}

export const useCamera = (config: CameraConfig) => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check camera support
  useEffect(() => {
    setIsSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    if (!isSupported) {
      setError('Camera not supported in this browser');
      return false;
    }

    try {
      setError(null);
      
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: config.width },
          height: { ideal: config.height },
          facingMode: config.facingMode,
          frameRate: { ideal: config.frameRate, max: config.frameRate }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Create video element if it doesn't exist
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.playsInline = true;
        video.muted = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        videoRef.current = video;
      }

      // Create canvas for frame capture
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = config.width;
        canvas.height = config.height;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        canvasRef.current = canvas;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      setIsActive(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      return false;
    }
  }, [isSupported, config]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, []);

  // Capture current frame as ImageData
  const captureFrame = useCallback((): ImageData | null => {
    if (!isActive || !videoRef.current || !canvasRef.current) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [isActive]);

  // Start continuous frame processing
  const startFrameProcessing = useCallback((
    onFrame: (imageData: ImageData) => void,
    targetFPS: number = config.frameRate
  ) => {
    if (!isActive) return;

    const interval = 1000 / targetFPS;
    let lastTime = 0;

    const processFrame = (currentTime: number) => {
      if (!isActive) return;

      if (currentTime - lastTime >= interval) {
        const frameData = captureFrame();
        if (frameData) {
          onFrame(frameData);
        }
        lastTime = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive, captureFrame, config.frameRate]);

  // Stop frame processing
  const stopFrameProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      
      // Clean up DOM elements
      if (videoRef.current && videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
      }
    };
  }, [stopCamera]);

  return {
    isActive,
    isSupported,
    error,
    startCamera,
    stopCamera,
    captureFrame,
    startFrameProcessing,
    stopFrameProcessing,
    videoElement: videoRef.current
  };
};