/**
 * PRODUCTION ML Inference Hook
 * Real object detection and embeddings using transformers.js
 * NO MOCKS - Production-grade computer vision
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { pipeline, env } from '@huggingface/transformers';
import { SAFETY } from '../config/safety';
import { cocoToHazard, laneOf, distanceOf, type HazardType, type Lane, type Distance } from '../ml/hazardMap';
import { cosineSim } from '../ml/vector';
import { tObserve } from '../telemetry/metrics';

// Configure for production
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
env.backends.onnx.wasm.numThreads = 1;

export interface Detection {
  bbox: [number, number, number, number]; // x,y,w,h in px
  score: number;
  className: string;
  hazard: HazardType;
  lane: Lane;
  distance: Distance;
}

export interface ItemHit {
  bbox: [number, number, number, number];
  score: number;
  className: string;
  hazard: HazardType;
  lane: Lane;
  distance: Distance;
  similarity: number;
}

export function useMLInference() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const detectorRef = useRef<any>(null);
  const embedderRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const busyRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function initModels() {
      try {
        setIsLoading(true);
        console.log('[useMLInference] Loading PRODUCTION ML models...');

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 640;
        canvasRef.current = canvas;

        // Load DETR object detection model (REAL, not mock)
        console.log('[useMLInference] Loading DETR ResNet-50...');
        let detector;
        try {
          detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
        } catch (err) {
          console.error('[useMLInference] Failed to load detector:', err);
          throw new Error('Failed to load object detection model');
        }

        // Load feature extraction for embeddings (REAL, not mock)
        console.log('[useMLInference] Loading feature extractor...');
        const embedder = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2'
        );

        if (mounted) {
          detectorRef.current = detector;
          embedderRef.current = embedder;
          setIsInitialized(true);
          setIsLoading(false);
          console.log('[useMLInference] ✓ PRODUCTION models loaded');
        }
      } catch (err) {
        console.error('[useMLInference] CRITICAL: Model loading FAILED:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load ML models');
          setIsLoading(false);
        }
      }
    }

    initModels();

    return () => {
      mounted = false;
    };
  }, []);

  const detectObjects = useCallback(async (imageData: ImageData): Promise<Detection[]> => {
    if (!isInitialized || !canvasRef.current || !detectorRef.current) {
      throw new Error('ML models not ready - cannot detect');
    }

    try {
      const t0 = performance.now();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);

      // REAL object detection with DETR
      const detections = await detectorRef.current(canvas, {
        threshold: SAFETY.MIN_DETR_SCORE,
        percentage: true,
      });

      const inferenceTime = performance.now() - t0;
      tObserve('detect_ms', inferenceTime);
      
      console.log(`[useMLInference] ✓ Detected ${detections.length} objects (${inferenceTime.toFixed(1)}ms)`);

      const frameArea = imageData.width * imageData.height;

      const results: Detection[] = detections.map((det: any) => {
        const xmin = Math.round(det.box.xmin * imageData.width / 100);
        const ymin = Math.round(det.box.ymin * imageData.height / 100);
        const xmax = Math.round(det.box.xmax * imageData.width / 100);
        const ymax = Math.round(det.box.ymax * imageData.height / 100);
        
        const x = xmin;
        const y = ymin;
        const w = xmax - xmin;
        const h = ymax - ymin;
        
        const hazard = cocoToHazard(det.label);
        const lane = laneOf(x + w/2, imageData.width, SAFETY.CENTER_LANE_BAND);
        const distance = distanceOf(w*h, frameArea, SAFETY.NEAR_AREA_RATIO, SAFETY.MID_AREA_RATIO);

        return {
          bbox: [x, y, w, h],
          score: det.score,
          className: det.label,
          hazard,
          lane,
          distance
        };
      });

      return results;
    } catch (err) {
      console.error('[useMLInference] CRITICAL: Detection FAILED:', err);
      throw err;
    }
  }, [isInitialized]);

  const generateEmbedding = useCallback(async (
    source: ImageData | ImageBitmap | HTMLCanvasElement
  ): Promise<Float32Array> => {
    if (!isInitialized || !canvasRef.current || !embedderRef.current) {
      throw new Error('ML models not ready - cannot generate embedding');
    }

    try {
      const t0 = performance.now();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = 384;
      canvas.height = 384;
      
      if (source instanceof ImageData) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = source.width;
        tempCanvas.height = source.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(source, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, 384, 384);
      } else {
        ctx.drawImage(source, 0, 0, 384, 384);
      }

      // REAL embedding generation
      const result = await embedderRef.current(canvas, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = new Float32Array(result.data);
      
      const inferenceTime = performance.now() - t0;
      tObserve('embed_ms', inferenceTime);
      
      console.log(`[useMLInference] ✓ Generated ${embedding.length}D embedding (${inferenceTime.toFixed(1)}ms)`);

      return embedding;
    } catch (err) {
      console.error('[useMLInference] CRITICAL: Embedding FAILED:', err);
      throw err;
    }
  }, [isInitialized]);

  const searchForItem = useCallback(async (
    imageData: ImageData,
    targetEmbedding: Float32Array
  ): Promise<ItemHit | null> => {
    if (busyRef.current >= SAFETY.MAX_CONCURRENT_INFER) return null;
    busyRef.current++;

    try {
      const t0 = performance.now();
      const dets = await detectObjects(imageData);
      const candidates = dets
        .sort((a,b) => b.score - a.score)
        .slice(0, SAFETY.TOPK_ITEM_CANDIDATES);

      if (!candidates.length) {
        busyRef.current--;
        return null;
      }

      // Crop each DETR bbox, embed, cosine-match
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = imageData.width;
      sourceCanvas.height = imageData.height;
      sourceCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

      const cropCanvas = document.createElement('canvas');
      const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })!;

      let best: ItemHit | null = null;

      for (const c of candidates) {
        const [x, y, w, h] = c.bbox;
        if (w < 8 || h < 8) continue;

        cropCanvas.width = w;
        cropCanvas.height = h;
        cropCtx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);

        const emb = await generateEmbedding(cropCanvas);
        const sim = cosineSim(targetEmbedding, emb);
        
        if (sim >= SAFETY.MIN_ITEM_COSINE) {
          const hit: ItemHit = { ...c, similarity: sim };
          if (!best || sim > best.similarity) best = hit;
        }
      }

      const searchTime = performance.now() - t0;
      tObserve('search_ms', searchTime);

      if (best) {
        console.log(`[useMLInference] ✓ Item found: ${best.className} (${(best.similarity*100).toFixed(1)}% match)`);
      }

      // MEMORY FIX: Explicitly cleanup canvases to prevent memory leaks
      sourceCanvas.width = 0;
      sourceCanvas.height = 0;
      cropCanvas.width = 0;
      cropCanvas.height = 0;

      return best;
    } catch (err) {
      console.error('[useMLInference] Search FAILED:', err);
      return null;
    } finally {
      busyRef.current--;
    }
  }, [detectObjects, generateEmbedding]);

  return {
    isInitialized,
    isLoading,
    error,
    detectObjects,
    generateEmbedding,
    searchForItem
  };
}
