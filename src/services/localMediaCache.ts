/**
 * localMediaCache.ts
 *
 * Persistent client device memory for chat media photos.
 * Preserves pictures locally in the user's mobile/browser IndexedDB
 * even after the 24-hour server expiration period has passed.
 */

const DB_NAME = 'qchat_local_media_db';
const STORE_NAME = 'device_photos';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported on this environment'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

export interface CachedPhotoRecord {
  id: string; // messageId
  dataUrl: string;
  savedAt: number;
  fileName?: string;
}

export const localMediaCache = {
  /**
   * Save picture dataUrl into local device memory
   */
  async saveToDeviceMemory(messageId: string, dataUrl: string, fileName?: string): Promise<void> {
    if (!messageId || !dataUrl) return;

    let finalData = dataUrl;
    // If it's a remote URL, convert to local base64 data URL for offline device persistence
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      try {
        const resp = await fetch(dataUrl, { mode: 'cors' });
        if (resp.ok) {
          const blob = await resp.blob();
          const converted = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(dataUrl);
            reader.readAsDataURL(blob);
          });
          if (converted && converted.startsWith('data:')) {
            finalData = converted;
          }
        }
      } catch {
        // CORS or network fallback
        finalData = dataUrl;
      }
    }

    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record: CachedPhotoRecord = {
          id: messageId,
          dataUrl: finalData,
          savedAt: Date.now(),
          fileName: fileName || `qchat_photo_${Date.now()}.jpg`
        };
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    } catch {
      // Fallback to localStorage for environments where IndexedDB is blocked
      try {
        localStorage.setItem(`qchat_media_${messageId}`, finalData);
      } catch {
        // storage quota exceeded or disabled
      }
    }
  },

  /**
   * Retrieve picture from local device memory
   */
  async getFromDeviceMemory(messageId: string): Promise<string | null> {
    if (!messageId) return null;

    try {
      const db = await getDB();
      const record = await new Promise<CachedPhotoRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(messageId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (record && record.dataUrl) {
        return record.dataUrl;
      }
    } catch {
      // ignore, check fallback
    }

    try {
      return localStorage.getItem(`qchat_media_${messageId}`) || null;
    } catch {
      return null;
    }
  },

  /**
   * Check if image is stored in local device memory
   */
  async hasInDeviceMemory(messageId: string): Promise<boolean> {
    const data = await this.getFromDeviceMemory(messageId);
    return Boolean(data);
  },

  /**
   * Delete picture from local device memory (for vanishing messages)
   */
  async deleteFromDeviceMemory(messageId: string): Promise<void> {
    if (!messageId) return;
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(messageId);
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem(`qchat_media_${messageId}`);
    } catch {
      // ignore
    }
  },

  /**
   * Get all photos saved in local device memory
   */
  async getAllDevicePhotos(): Promise<CachedPhotoRecord[]> {
    try {
      const db = await getDB();
      return new Promise<CachedPhotoRecord[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const results: CachedPhotoRecord[] = req.result || [];
          results.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
          resolve(results);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      // Fallback: check localStorage for cached photos
      const fallback: CachedPhotoRecord[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('qchat_media_')) {
            const dataUrl = localStorage.getItem(key);
            if (dataUrl) {
              fallback.push({
                id: key.replace('qchat_media_', ''),
                dataUrl,
                savedAt: Date.now(),
                fileName: 'Cached Photo'
              });
            }
          }
        }
      } catch {
        // ignore
      }
      return fallback;
    }
  },

  /**
   * Gallery permission state: 'granted' | 'denied' | 'prompt'
   */
  getGalleryPermission(): 'granted' | 'denied' | 'prompt' {
    try {
      const saved = localStorage.getItem('qchat_gallery_permission');
      if (saved === 'granted' || saved === 'denied') {
        return saved;
      }
      return 'prompt';
    } catch {
      return 'prompt';
    }
  },

  setGalleryPermission(status: 'granted' | 'denied'): void {
    try {
      localStorage.setItem('qchat_gallery_permission', status);
    } catch {
      // ignore
    }
  },

  /**
   * Calculate 24-hour server expiry countdown
   */
  formatRemainingExpiry(expiresAt?: number): {
    isExpired: boolean;
    remainingText: string;
    hoursLeft: number;
  } {
    if (!expiresAt) {
      return { isExpired: false, remainingText: '', hoursLeft: 24 };
    }
    const diff = expiresAt - Date.now();
    if (diff <= 0) {
      return { isExpired: true, remainingText: 'Server vanished (24h passed)', hoursLeft: 0 };
    }

    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return { isExpired: false, remainingText: `${hours}h ${minutes}m left on server`, hoursLeft: hours };
    }
    return { isExpired: false, remainingText: `${minutes}m left on server`, hoursLeft: 0 };
  },

  /**
   * Download image to user's mobile / device download storage
   */
  downloadImage(dataUrl: string, fileName = 'qchat_photo.jpg') {
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  }
};
