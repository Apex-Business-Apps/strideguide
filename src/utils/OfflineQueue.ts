/**
 * Offline Request Queue
 * Queues requests when offline and syncs when connection is restored
 */

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface QueueConfig {
  maxRetries?: number;
  retryDelay?: number;
  maxQueueSize?: number;
  syncOnReconnect?: boolean;
}

const DEFAULT_CONFIG: Required<QueueConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  maxQueueSize: 100,
  syncOnReconnect: true,
};

const QUEUE_STORAGE_KEY = 'offline_request_queue';

export class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private config: Required<QueueConfig>;
  private isSyncing = false;
  private listeners: Array<(queue: QueuedRequest[]) => void> = [];

  constructor(config: QueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadQueue();
    this.setupListeners();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[OfflineQueue] Loaded ${this.queue.length} queued requests`);
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error('[OfflineQueue] Failed to save queue:', error);
    }
  }

  /**
   * Setup online/offline event listeners
   */
  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[OfflineQueue] Connection restored, syncing queue...');
      if (this.config.syncOnReconnect) {
        this.sync();
      }
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineQueue] Connection lost, requests will be queued');
    });
  }

  /**
   * Add a request to the queue
   */
  async enqueue(
    url: string,
    options: RequestInit = {}
  ): Promise<{ queued: true; id: string } | { queued: false; error: string }> {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      return {
        queued: false,
        error: `Queue full (max ${this.config.maxQueueSize} requests)`,
      };
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queuedRequest: QueuedRequest = {
      id,
      url,
      method: options.method || 'GET',
      headers: this.serializeHeaders(options.headers),
      body: options.body?.toString(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    this.queue.push(queuedRequest);
    this.saveQueue();

    console.log(`[OfflineQueue] Queued ${queuedRequest.method} ${url}`);

    return { queued: true, id };
  }

  /**
   * Sync all queued requests
   */
  async sync(): Promise<{ success: number; failed: number; total: number }> {
    if (this.isSyncing) {
      console.log('[OfflineQueue] Sync already in progress');
      return { success: 0, failed: 0, total: this.queue.length };
    }

    if (!navigator.onLine) {
      console.log('[OfflineQueue] Cannot sync - offline');
      return { success: 0, failed: 0, total: this.queue.length };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;
    const totalCount = this.queue.length;

    console.log(`[OfflineQueue] Starting sync of ${totalCount} requests`);

    // Process queue in order
    while (this.queue.length > 0) {
      const request = this.queue[0];

      try {
        await this.executeRequest(request);
        // Success - remove from queue
        this.queue.shift();
        successCount++;
        this.saveQueue();
      } catch (error) {
        request.retryCount++;

        if (request.retryCount >= request.maxRetries) {
          // Max retries exceeded - remove from queue
          console.error(
            `[OfflineQueue] Request ${request.id} failed after ${request.retryCount} retries`,
            error
          );
          this.queue.shift();
          failedCount++;
          this.saveQueue();
        } else {
          // Retry later - move to back of queue
          this.queue.shift();
          this.queue.push(request);
          this.saveQueue();

          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }

      // Check if we went offline during sync
      if (!navigator.onLine) {
        console.log('[OfflineQueue] Went offline during sync, pausing');
        break;
      }
    }

    this.isSyncing = false;

    const result = {
      success: successCount,
      failed: failedCount,
      total: totalCount,
    };

    console.log('[OfflineQueue] Sync complete:', result);

    return result;
  }

  /**
   * Execute a queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<Response> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Serialize headers for storage
   */
  private serializeHeaders(headers: any): Record<string, string> {
    if (!headers) return {};

    if (headers instanceof Headers) {
      const obj: Record<string, string> = {};
      headers.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }

    return headers as Record<string, string>;
  }

  /**
   * Get current queue
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
    console.log('[OfflineQueue] Queue cleared');
  }

  /**
   * Remove a specific request from queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(req => req.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * Add listener for queue changes
   */
  addListener(callback: (queue: QueuedRequest[]) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback: (queue: QueuedRequest[]) => void): void {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.queue]);
      } catch (error) {
        console.error('[OfflineQueue] Listener error:', error);
      }
    });
  }
}

// Singleton instance
let offlineQueueInstance: OfflineQueue | null = null;

/**
 * Get the global offline queue instance
 */
export function getOfflineQueue(config?: QueueConfig): OfflineQueue {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineQueue(config);
  }
  return offlineQueueInstance;
}
