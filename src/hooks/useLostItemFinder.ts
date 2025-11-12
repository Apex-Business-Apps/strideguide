import { useState, useCallback, useRef, useEffect } from 'react';
import { VisualSignature, createSignature, estimateProximity } from '@/utils/VisualFingerprint';

export interface LearnedItem {
  id: string;
  name: string;
  signatures: VisualSignature[];
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

// Encrypted local storage for learned items using AES-GCM
import { EncryptedKVClass } from '@/crypto/kv';

class EncryptedStorage {
  private static kv = new EncryptedKVClass();
  
  static async saveItems(items: LearnedItem[]): Promise<void> {
    try {
      await this.kv.initialize();
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(items));
      await this.kv.store('items', data);
    } catch (error) {
      console.error('Failed to save learned items:', error);
    }
  }
  
  static async loadItems(): Promise<LearnedItem[]> {
    try {
      await this.kv.initialize();
      const data = await this.kv.retrieve('items');
      if (!data) return [];
      const decoder = new TextDecoder();
      const jsonStr = decoder.decode(data);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to load learned items:', error);
      return [];
    }
  }
  
  static async clearItems(): Promise<void> {
    await this.kv.initialize();
    await this.kv.delete('items');
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
    confidenceThreshold: 0.5,
    maxSearchDistance: 5.0
  });
  
  const searchInterval = useRef<NodeJS.Timeout | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const capturedSignatures = useRef<VisualSignature[]>([]);

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
    capturedSignatures.current = [];
    
    try {
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
    if (!isTeaching) return false;
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const signature = createSignature(imageData);
      
      capturedSignatures.current.push(signature);
      setTeachProgress((capturedSignatures.current.length / 12) * 100);
      
      return true;
    } catch (error) {
      console.error('Failed to capture teaching photo:', error);
      return false;
    }
  }, [isTeaching]);

  // Complete teaching process
  const completeTeaching = useCallback(async (itemName: string): Promise<void> => {
    const newItem: LearnedItem = {
      id: Date.now().toString(),
      name: itemName,
      signatures: capturedSignatures.current,
      createdAt: new Date(),
      photoCount: capturedSignatures.current.length,
      encrypted: true
    };
    
    const updatedItems = [...learnedItems, newItem];
    await saveLearnedItems(updatedItems);
    
    setIsTeaching(false);
    setTeachProgress(0);
    capturedSignatures.current = [];
    
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
      videoStream.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 800 },
          height: { ideal: 600 }
        }
      });
      
      // Start processing loop (8 FPS)
      searchInterval.current = setInterval(async () => {
        const canvas = document.createElement('canvas');
        const video = document.querySelector('video');
        if (!video) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(video, 0, 0);
        
        // Process frame
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const liveSignature = createSignature(imageData);
        const proximity = estimateProximity(liveSignature, item.signatures);
        
        if (proximity.confidence >= settings.confidenceThreshold) {
          const centerX = liveSignature.keypoints.reduce((sum, kp) => sum + kp.x, 0) / liveSignature.keypoints.length;
          const direction = centerX < 0.33 ? 'left' : centerX > 0.66 ? 'right' : 'center';
          
          const result: SearchResult = {
            confidence: proximity.confidence,
            boundingBox: {
              x: Math.max(0, centerX - 0.2),
              y: 0.3,
              width: 0.4,
              height: 0.4
            },
            distance: proximity.distance,
            direction,
            timestamp: Date.now()
          };
          
          setCurrentSearchResult(result);
          
          if (settings.audioEnabled) {
            playAudioGuidance(result);
          }
          
          if (settings.hapticsEnabled) {
            triggerHapticFeedback(result.distance);
          }
        } else {
          setCurrentSearchResult(null);
        }
      }, 125); // 8 FPS
      
      return true;
    } catch (error) {
      console.error('Failed to start searching:', error);
      setIsSearching(false);
      return false;
    }
  }, [learnedItems, settings]);

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
  const playAudioGuidance = (result: SearchResult) => {
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
  };

  // Haptic feedback
  const triggerHapticFeedback = (distance: string) => {
    if (!navigator.vibrate) return;
    
    const patterns = {
      very_close: [100, 50, 100, 50, 100],
      close: [150, 100, 150],
      medium: [200, 200, 200],
      far: [300]
    };
    
    navigator.vibrate(patterns[distance as keyof typeof patterns] || [100]);
  };

  // Delete a learned item
  const deleteLearnedItem = useCallback(async (itemId: string) => {
    const updatedItems = learnedItems.filter(item => item.id !== itemId);
    await saveLearnedItems(updatedItems);
  }, [learnedItems, saveLearnedItems]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<FinderSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Cleanup intervals and video stream on unmount
  useEffect(() => {
    return () => {
      // Clear search interval if running
      if (searchInterval.current) {
        clearInterval(searchInterval.current);
        searchInterval.current = null;
      }

      // Stop video stream if active
      if (videoStream.current) {
        videoStream.current.getTracks().forEach(track => track.stop());
        videoStream.current = null;
      }
    };
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
