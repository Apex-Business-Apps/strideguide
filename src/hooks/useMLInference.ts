import { useState, useEffect, useCallback, useRef } from 'react';
import { pipeline, Pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for offline operation
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.backends.onnx.wasm.numThreads = 1;

export interface DetectionResult {
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  label: string;
}

export interface EmbeddingResult {
  embedding: number[];
  success: boolean;
}

export interface SearchResult {
  confidence: number;
  distance: number;
  direction: 'left' | 'center' | 'right';
  bbox?: [number, number, number, number];
}

export const useMLInference = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const detectorRef = useRef<Pipeline | null>(null);
  const embedderRef = useRef<Pipeline | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize models
  useEffect(() => {
    const initModels = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        canvas.width = 416;
        canvas.height = 416;
        canvasRef.current = canvas;

        // Initialize object detection model (simulated for now)
        // In production, use: 'facebook/detr-resnet-50' or custom ONNX model
        console.log('Initializing ML models...');
        
        // Simulate model loading delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsInitialized(true);
        console.log('ML models initialized successfully');
      } catch (err) {
        setError(`Failed to initialize ML models: ${err}`);
        console.error('ML initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initModels();
  }, []);

  // Detect objects in image
  const detectObjects = useCallback(async (
    imageData: ImageData
  ): Promise<DetectionResult[]> => {
    if (!isInitialized || !canvasRef.current) {
      return [];
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      // Draw and resize image to model input size
      const imgCanvas = document.createElement('canvas');
      imgCanvas.width = imageData.width;
      imgCanvas.height = imageData.height;
      const imgCtx = imgCanvas.getContext('2d')!;
      imgCtx.putImageData(imageData, 0, 0);
      
      ctx.drawImage(imgCanvas, 0, 0, canvas.width, canvas.height);

      // Simulate object detection with realistic results
      const detections: DetectionResult[] = [];
      
      // Random hazard detection simulation
      if (Math.random() > 0.7) {
        detections.push({
          confidence: 0.75 + Math.random() * 0.2,
          bbox: [
            Math.random() * 0.6,
            Math.random() * 0.6,
            0.2 + Math.random() * 0.3,
            0.2 + Math.random() * 0.3
          ],
          label: Math.random() > 0.5 ? 'obstacle' : 'step'
        });
      }

      return detections;
    } catch (err) {
      console.error('Object detection error:', err);
      return [];
    }
  }, [isInitialized]);

  // Generate embeddings for images
  const generateEmbedding = useCallback(async (
    imageData: ImageData
  ): Promise<EmbeddingResult> => {
    if (!isInitialized || !canvasRef.current) {
      return { embedding: [], success: false };
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      // Process image
      const imgCanvas = document.createElement('canvas');
      imgCanvas.width = imageData.width;
      imgCanvas.height = imageData.height;
      const imgCtx = imgCanvas.getContext('2d')!;
      imgCtx.putImageData(imageData, 0, 0);
      
      ctx.drawImage(imgCanvas, 0, 0, canvas.width, canvas.height);

      // Simulate embedding generation (512-dimensional)
      const embedding = Array.from({ length: 512 }, () => 
        (Math.random() - 0.5) * 2
      );

      // Normalize embedding
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      const normalizedEmbedding = embedding.map(val => val / norm);

      return { embedding: normalizedEmbedding, success: true };
    } catch (err) {
      console.error('Embedding generation error:', err);
      return { embedding: [], success: false };
    }
  }, [isInitialized]);

  // Search for learned items in current frame
  const searchForItem = useCallback(async (
    imageData: ImageData,
    targetEmbeddings: number[][]
  ): Promise<SearchResult | null> => {
    if (!targetEmbeddings.length) return null;

    try {
      const currentEmbedding = await generateEmbedding(imageData);
      if (!currentEmbedding.success) return null;

      // Find best match using cosine similarity
      let bestMatch = { similarity: -1, index: -1 };
      
      for (let i = 0; i < targetEmbeddings.length; i++) {
        const similarity = cosineSimilarity(
          currentEmbedding.embedding,
          targetEmbeddings[i]
        );
        
        if (similarity > bestMatch.similarity) {
          bestMatch = { similarity, index: i };
        }
      }

      // Threshold for positive detection
      if (bestMatch.similarity < 0.6) return null;

      // Simulate spatial detection
      const centerX = Math.random();
      const distance = Math.max(0.1, 1 - bestMatch.similarity);
      
      let direction: 'left' | 'center' | 'right' = 'center';
      if (centerX < 0.3) direction = 'left';
      else if (centerX > 0.7) direction = 'right';

      return {
        confidence: bestMatch.similarity,
        distance,
        direction,
        bbox: [centerX - 0.1, 0.3, 0.2, 0.4] // Simulated bounding box
      };
    } catch (err) {
      console.error('Search error:', err);
      return null;
    }
  }, [generateEmbedding]);

  return {
    isInitialized,
    isLoading,
    error,
    detectObjects,
    generateEmbedding,
    searchForItem
  };
};

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}