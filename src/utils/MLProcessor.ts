/**
 * MLProcessor - PRODUCTION On-device Machine Learning
 * Uses ONNX Runtime Web with WebGPU/WebGL for real computer vision
 * NO MOCKS - Real inference only
 */

import * as ort from 'onnxruntime-web';

interface MLModel {
  session: ort.InferenceSession;
  inputName: string;
  outputName: string;
}

interface EmbeddingResult {
  embedding: Float32Array;
  confidence: number;
}

interface DetectionResult {
  bbox: [number, number, number, number];
  confidence: number;
  embedding: Float32Array;
}

class MLProcessorClass {
  private model: MLModel | null = null;
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[MLProcessor] Initializing PRODUCTION ML models...');
      
      // Configure ONNX Runtime for production
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
      ort.env.wasm.numThreads = 1;
      ort.env.webgpu.powerPreference = 'low-power';

      // Use MobileNetV2 for real image embeddings (224x224 input)
      // This is a production-ready model optimized for mobile/web
      const modelUrl = 'https://huggingface.co/Xenova/mobilenet_v2_1.0_224/resolve/main/onnx/model.onnx';
      
      console.log('[MLProcessor] Downloading MobileNetV2 from HuggingFace...');
      const modelBuffer = await fetch(modelUrl).then(async r => {
        if (!r.ok) throw new Error(`Model download failed: ${r.status}`);
        return r.arrayBuffer();
      });

      console.log('[MLProcessor] Creating inference session...');
      // Try WebGPU -> WebGL -> WASM
      const providers = ['webgpu', 'webgl', 'wasm'] as const;
      let lastError: Error | null = null;

      for (const provider of providers) {
        try {
          const session = await ort.InferenceSession.create(modelBuffer, {
            executionProviders: [provider],
            graphOptimizationLevel: 'all',
            enableMemPattern: true,
            enableCpuMemArena: true,
          });

          const inputNames = session.inputNames;
          const outputNames = session.outputNames;

          this.model = {
            session,
            inputName: inputNames[0],
            outputName: outputNames[0],
          };

          console.log(`[MLProcessor] ✓ REAL MODEL loaded with ${provider} backend`);
          console.log(`[MLProcessor] Input: ${this.model.inputName}, Output: ${this.model.outputName}`);
          this.initialized = true;
          return;
        } catch (err) {
          lastError = err as Error;
          console.warn(`[MLProcessor] ${provider} failed:`, err);
        }
      }

      throw new Error(`CRITICAL: All ML backends failed. Last error: ${lastError?.message}`);
    } catch (error) {
      console.error('[MLProcessor] CRITICAL: Model initialization FAILED:', error);
      throw error;
    }
  }

  async computeEmbedding(imageData: ImageData): Promise<EmbeddingResult> {
    await this.initialize();

    if (!this.model) {
      throw new Error('CRITICAL: ML model not initialized - cannot generate embeddings');
    }

    try {
      const startTime = performance.now();
      const inputTensor = this.preprocessImage(imageData);
      
      const feeds = { [this.model.inputName]: inputTensor };
      const results = await this.model.session.run(feeds);
      const output = results[this.model.outputName];

      // MobileNetV2 outputs 1280-dimensional embeddings
      const embedding = new Float32Array(output.data as Float32Array);
      
      // L2 normalize
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      
      if (magnitude > 0) {
        for (let i = 0; i < embedding.length; i++) {
          embedding[i] /= magnitude;
        }
      }

      const inferenceTime = performance.now() - startTime;
      const confidence = Math.min(magnitude / 50, 1.0);

      console.log('[MLProcessor] ✓ REAL embedding:', {
        dims: embedding.length,
        confidence: confidence.toFixed(3),
        ms: inferenceTime.toFixed(1),
      });

      return { embedding, confidence };
    } catch (error) {
      console.error('[MLProcessor] CRITICAL: Inference FAILED:', error);
      throw error;
    }
  }

  private preprocessImage(imageData: ImageData): ort.Tensor {
    const targetSize = 224;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tempCanvas, 0, 0, targetSize, targetSize);
    const resizedImageData = ctx.getImageData(0, 0, targetSize, targetSize);

    // NCHW format: [1, 3, 224, 224]
    const float32Data = new Float32Array(3 * targetSize * targetSize);
    const { data } = resizedImageData;

    // ImageNet normalization (required for MobileNetV2)
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let i = 0; i < targetSize * targetSize; i++) {
      const pixelOffset = i * 4;
      
      float32Data[i] = (data[pixelOffset] / 255.0 - mean[0]) / std[0];
      float32Data[targetSize * targetSize + i] = (data[pixelOffset + 1] / 255.0 - mean[1]) / std[1];
      float32Data[2 * targetSize * targetSize + i] = (data[pixelOffset + 2] / 255.0 - mean[2]) / std[2];
    }

    return new ort.Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);
  }

  computeCosineSimilarity(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  async detectInRegions(imageData: ImageData, targetEmbedding: Float32Array): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    const gridSize = 3;
    const regionWidth = Math.floor(imageData.width / gridSize);
    const regionHeight = Math.floor(imageData.height / gridSize);

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = col * regionWidth;
        const y = row * regionHeight;
        
        const regionData = this.extractRegion(imageData, x, y, regionWidth, regionHeight);
        const { embedding, confidence } = await this.computeEmbedding(regionData);
        
        const similarity = this.computeCosineSimilarity(embedding, targetEmbedding);
        
        if (similarity > 0.5) {
          results.push({
            bbox: [x, y, regionWidth, regionHeight],
            confidence: similarity * confidence,
            embedding
          });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private extractRegion(imageData: ImageData, x: number, y: number, width: number, height: number): ImageData {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    return ctx.getImageData(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
  }

  isReady(): boolean {
    return this.initialized;
  }

  dispose(): void {
    if (this.model?.session) {
      this.model.session.release();
      this.model = null;
    }
    this.initialized = false;
  }
}

export const MLProcessor = new MLProcessorClass();
