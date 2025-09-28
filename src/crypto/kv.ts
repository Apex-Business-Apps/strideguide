/**
 * Encrypted IndexedDB wrapper for StrideGuide
 * Uses AES-GCM 256 with device-bound keys for local data encryption
 */

interface StoredKey {
  wrappedKey: ArrayBuffer;
  salt: Uint8Array;
  iv: Uint8Array;
}

class EncryptedKVClass {
  private db: IDBDatabase | null = null;
  private cryptoKey: CryptoKey | null = null;
  private readonly DB_NAME = 'stride-encrypted-kv';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'encrypted-data';
  private readonly KEY_STORE_NAME = 'device-keys';

  async initialize(): Promise<void> {
    if (this.db) return;

    // Initialize IndexedDB
    this.db = await this.openDatabase();
    
    // Initialize or load encryption key
    await this.initializeCryptoKey();
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create encrypted data store
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
        
        // Create key store
        if (!db.objectStoreNames.contains(this.KEY_STORE_NAME)) {
          db.createObjectStore(this.KEY_STORE_NAME);
        }
      };
    });
  }

  private async initializeCryptoKey(): Promise<void> {
    const storedKey = await this.getStoredKey();
    
    if (storedKey) {
      // Unwrap existing key
      this.cryptoKey = await this.unwrapKey(storedKey);
    } else {
      // Generate new key
      this.cryptoKey = await this.generateAndStoreKey();
    }
  }

  private async getStoredKey(): Promise<StoredKey | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.KEY_STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.KEY_STORE_NAME);
      const request = store.get('master-key');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async generateAndStoreKey(): Promise<CryptoKey> {
    // Generate random salt for device binding
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Create device fingerprint (simple but effective for local binding)
    const deviceData = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|');
    
    const encoder = new TextEncoder();
    const deviceBuffer = encoder.encode(deviceData);
    
    // Derive key material from device data + salt
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      deviceBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Generate master key
    const masterKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Generate wrapping key for storage
    const wrappingKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100001, // Different iteration count
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-KW', length: 256 },
      false,
      ['wrapKey', 'unwrapKey']
    );
    
    // Wrap master key for storage
    const wrappedKey = await crypto.subtle.wrapKey(
      'raw',
      masterKey,
      wrappingKey,
      'AES-KW'
    );
    
    // Store wrapped key
    const iv = crypto.getRandomValues(new Uint8Array(12));
    await this.storeWrappedKey({ wrappedKey, salt, iv });
    
    return masterKey;
  }

  private async unwrapKey(storedKey: StoredKey): Promise<CryptoKey> {
    // Recreate device fingerprint
    const deviceData = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|');
    
    const encoder = new TextEncoder();
    const deviceBuffer = encoder.encode(deviceData);
    
    // Derive key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      deviceBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Recreate wrapping key
    const wrappingKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: storedKey.salt,
        iterations: 100001,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-KW', length: 256 },
      false,
      ['wrapKey', 'unwrapKey']
    );
    
    // Unwrap master key
    return await crypto.subtle.unwrapKey(
      'raw',
      storedKey.wrappedKey,
      wrappingKey,
      'AES-KW',
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async storeWrappedKey(storedKey: StoredKey): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.KEY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.KEY_STORE_NAME);
      const request = store.put(storedKey, 'master-key');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async encrypt(data: Uint8Array): Promise<Uint8Array> {
    if (!this.cryptoKey) throw new Error('Crypto key not initialized');
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      data
    );
    
    // Combine IV + encrypted data
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);
    
    return result;
  }

  async decrypt(encryptedData: Uint8Array): Promise<Uint8Array> {
    if (!this.cryptoKey) throw new Error('Crypto key not initialized');
    
    // Extract IV and encrypted data
    const iv = encryptedData.slice(0, 12);
    const encrypted = encryptedData.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      encrypted
    );
    
    return new Uint8Array(decrypted);
  }

  async store(key: string, data: Uint8Array): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const encrypted = await this.encrypt(data);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(encrypted, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async retrieve(key: string): Promise<Uint8Array | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const encrypted = await new Promise<Uint8Array | null>((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
    
    if (!encrypted) return null;
    
    return await this.decrypt(encrypted);
  }

  async delete(key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME, this.KEY_STORE_NAME], 'readwrite');
      
      const dataStore = transaction.objectStore(this.STORE_NAME);
      const keyStore = transaction.objectStore(this.KEY_STORE_NAME);
      
      const clearData = dataStore.clear();
      const clearKeys = keyStore.clear();
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => {
        this.cryptoKey = null;
        resolve();
      };
    });
  }

  async list(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAllKeys();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }
}

export const EncryptedKV = new EncryptedKVClass();