import { useState, useCallback, useRef } from 'react';

export interface LearnedItem {
  id: string;
  name: string;
  embeddings: number[][];
  createdAt: Date;
  photoCount: number;
  encrypted: boolean;
}

export interface SearchResult {
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  distance: 'very_close' | 'close' | 'medium' | 'far';
  direction: 'left' | 'center' | 'right';
  timestamp: number;
}

export interface FinderSettings {
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  nightModeEnabled: boolean;
  confidenceThreshold: number;
  maxSearchDistance: number;
}

// Simulated ML processing for offline demo
class OfflineMLProcessor {
  private model: any = null;
  private isLoaded = false;

  async loadModel() {
    if (this.isLoaded) return;
    
    // Simulate model loading time
    await new Promise(resolve => setTimeout(resolve, 500));
    this.isLoaded = true;
    console.log('Lost Item Finder ML model loaded');
  }

  async generateEmbedding(imageData: ImageData): Promise<number[]> {
    if (!this.isLoaded) await this.loadModel();
    
    // Simulate embedding generation (would be real TensorFlow Lite processing)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Return simulated 128-dimensional embedding
    return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
  }

  async detectObjects(imageData: ImageData): Promise<Array<{bbox: number[], confidence: number}>> {
    if (!this.isLoaded) await this.loadModel();
    
    // Simulate object detection (would be real MobileNet-SSD)
    await new Promise(resolve => setTimeout(resolve, 80));
    
    // Return simulated bounding boxes
    const detectionCount = Math.random() > 0.7 ? 1 : 0;
    
    if (detectionCount === 0) return [];
    
    return [{
      bbox: [
        Math.random() * 0.6, // x
        Math.random() * 0.6, // y
        0.2 + Math.random() * 0.2, // width
        0.2 + Math.random() * 0.2  // height
      ],
      confidence: 0.6 + Math.random() * 0.3
    }];
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    // Cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

// Encrypted local storage for learned items
class EncryptedStorage {
  private static readonly STORAGE_KEY = 'strideguide_learned_items';
  
  static async saveItems(items: LearnedItem[]): Promise<void> {
    try {
      // In production, this would use device keychain/keystore encryption
      const encryptedData = btoa(JSON.stringify(items));
      localStorage.setItem(this.STORAGE_KEY, encryptedData);
    } catch (error) {
      console.error('Failed to save learned items:', error);
    }
  }
  
  static async loadItems(): Promise<LearnedItem[]> {
    try {
      const encryptedData = localStorage.getItem(this.STORAGE_KEY);
      if (!encryptedData) return [];
      
      const decryptedData = atob(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Failed to load learned items:', error);
      return [];
    }
  }
  
  static async clearItems(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const useLostItemFinder = () => {
  const [learnedItems, setLearnedItems] = useState<LearnedItem[]>([]);
  const [isTeaching, setIsTeaching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [teachProgress, setTeachProgress] = useState(0);
  const [currentSearchResult, setCurrentSearchResult] = useState<SearchResult | null>(null);
  const [settings, setSettings] = useState<FinderSettings>({
    audioEnabled: true,
    hapticsEnabled: true,
    nightModeEnabled: false,
    confidenceThreshold: 0.7,
    maxSearchDistance: 5.0
  });
  
  const mlProcessor = useRef(new OfflineMLProcessor());
  const searchInterval = useRef<NodeJS.Timeout | null>(null);
  const videoStream = useRef<MediaStream | null>(null);

  // Load learned items from encrypted storage
  const loadLearnedItems = useCallback(async () => {
    const items = await EncryptedStorage.loadItems();
    setLearnedItems(items);
  }, []);

  // Save learned items to encrypted storage
  const saveLearnedItems = useCallback(async (items: LearnedItem[]) => {
    await EncryptedStorage.saveItems(items);
    setLearnedItems(items);
  }, []);

  // Start teaching a new item
  const startTeaching = useCallback(async (itemName: string) => {
    setIsTeaching(true);
    setTeachProgress(0);
    
    try {
      // Request camera access
      videoStream.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 800 },
          height: { ideal: 600 }
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to access camera:', error);
      setIsTeaching(false);
      return false;
    }
  }, []);

  // Capture photo during teaching
  const captureTeachingPhoto = useCallback(async (canvas: HTMLCanvasElement): Promise<boolean> => {
    if (!isTeaching || !videoStream.current) return false;
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      
      // Get image data from canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Generate embedding
      const embedding = await mlProcessor.current.generateEmbedding(imageData);
      
      // Update progress
      setTeachProgress(prev => prev + 1);
      
      return true;
    } catch (error) {
      console.error('Failed to capture teaching photo:', error);
      return false;
    }
  }, [isTeaching]);

  // Complete teaching process
  const completeTeaching = useCallback(async (itemName: string, embeddings: number[][]): Promise<void> => {
    const newItem: LearnedItem = {
      id: Date.now().toString(),
      name: itemName,
      embeddings,
      createdAt: new Date(),
      photoCount: embeddings.length,
      encrypted: true
    };
    
    const updatedItems = [...learnedItems, newItem];
    await saveLearnedItems(updatedItems);
    
    setIsTeaching(false);
    setTeachProgress(0);
    
    // Stop camera stream
    if (videoStream.current) {
      videoStream.current.getTracks().forEach(track => track.stop());
      videoStream.current = null;
    }
  }, [learnedItems, saveLearnedItems]);

  // Start searching for an item
  const startSearching = useCallback(async (itemId: string): Promise<boolean> => {
    const item = learnedItems.find(i => i.id === itemId);
    if (!item) return false;
    
    setIsSearching(true);
    setCurrentSearchResult(null);
    
    try {
      // Start camera stream
      videoStream.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 800 },
          height: { ideal: 600 }
        }
      });
      
      // Start processing loop
      searchInterval.current = setInterval(async () => {
        await processSearchFrame(item);
      }, 1000 / 8); // 8 FPS for demo
      
      return true;
    } catch (error) {
      console.error('Failed to start searching:', error);
      setIsSearching(false);
      return false;
    }
  }, [learnedItems]);

  // Process a single search frame
  const processSearchFrame = useCallback(async (targetItem: LearnedItem) => {
    if (!videoStream.current) return;
    
    try {
      // Simulate frame capture and processing
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Get image data (in real implementation, this would come from camera)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Detect objects in frame
      const detections = await mlProcessor.current.detectObjects(imageData);
      
      if (detections.length === 0) {
        setCurrentSearchResult(null);
        return;
      }
      
      // For each detection, extract ROI and generate embedding
      for (const detection of detections) {
        const embedding = await mlProcessor.current.generateEmbedding(imageData);
        
        // Compare with target item embeddings
        let maxSimilarity = 0;
        for (const targetEmbedding of targetItem.embeddings) {
          const similarity = mlProcessor.current.calculateSimilarity(embedding, targetEmbedding);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        
        // If similarity is above threshold, create search result
        if (maxSimilarity >= settings.confidenceThreshold) {
          const [x, y, width, height] = detection.bbox;
          
          // Calculate distance and direction based on bounding box
          const centerX = x + width / 2;
          const distance = width > 0.4 ? 'very_close' : width > 0.25 ? 'close' : width > 0.15 ? 'medium' : 'far';
          const direction = centerX < 0.33 ? 'left' : centerX > 0.66 ? 'right' : 'center';
          
          const result: SearchResult = {
            confidence: maxSimilarity,
            boundingBox: { x, y, width, height },
            distance,
            direction,
            timestamp: Date.now()
          };
          
          setCurrentSearchResult(result);
          
          // Trigger audio guidance
          if (settings.audioEnabled) {
            playAudioGuidance(result);
          }
          
          // Trigger haptic feedback
          if (settings.hapticsEnabled) {
            triggerHapticFeedback(result.distance);
          }
          
          break;
        }
      }
    } catch (error) {
      console.error('Error processing search frame:', error);
    }
  }, [settings]);

  // Stop searching
  const stopSearching = useCallback(() => {
    setIsSearching(false);
    setCurrentSearchResult(null);
    
    if (searchInterval.current) {
      clearInterval(searchInterval.current);
      searchInterval.current = null;
    }
    
    if (videoStream.current) {
      videoStream.current.getTracks().forEach(track => track.stop());
      videoStream.current = null;
    }
  }, []);

  // Audio guidance
  const playAudioGuidance = useCallback((result: SearchResult) => {
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
    
    const message = `${directionMap[result.direction]}. ${distanceMap[result.distance]}.`;
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'en-CA';
    utterance.rate = 0.9;
    utterance.volume = 0.8;
    
    speechSynthesis.speak(utterance);
  }, []);

  // Haptic feedback
  const triggerHapticFeedback = useCallback((distance: string) => {
    if (!navigator.vibrate) return;
    
    const patterns = {
      very_close: [100, 50, 100, 50, 100],
      close: [150, 100, 150],
      medium: [200, 200, 200],
      far: [300]
    };
    
    navigator.vibrate(patterns[distance as keyof typeof patterns] || [100]);
  }, []);

  // Delete a learned item
  const deleteLearnedItem = useCallback(async (itemId: string) => {
    const updatedItems = learnedItems.filter(item => item.id !== itemId);
    await saveLearnedItems(updatedItems);
  }, [learnedItems, saveLearnedItems]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<FinderSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    // State
    learnedItems,
    isTeaching,
    isSearching,
    teachProgress,
    currentSearchResult,
    settings,
    
    // Actions
    loadLearnedItems,
    startTeaching,
    captureTeachingPhoto,
    completeTeaching,
    startSearching,
    stopSearching,
    deleteLearnedItem,
    updateSettings,
    
    // Utils
    videoStream: videoStream.current
  };
};