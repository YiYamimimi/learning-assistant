/* global IDBDatabase, IDBOpenDBRequest, indexedDB, File */

const DB_NAME = 'LongCutDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

export class VideoStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
          store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }
      };
    });
  }

  async saveVideo(hash: string, file: File): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const videoData = {
        hash,
        file,
        uploadedAt: Date.now(),
      };

      const request = store.put(videoData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save video'));
    });
  }

  async getVideo(hash: string): Promise<File | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(hash);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.file : null);
      };

      request.onerror = () => reject(new Error('Failed to get video'));
    });
  }

  async deleteVideo(hash: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(hash);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete video'));
    });
  }

  async getAllVideos(): Promise<Array<{ hash: string; file: File; uploadedAt: number }>> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(new Error('Failed to get all videos'));
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear all videos'));
    });
  }

  async isVideoStored(hash: string): Promise<boolean> {
    const video = await this.getVideo(hash);
    return video !== null;
  }

  async getStorageSize(): Promise<number> {
    const videos = await this.getAllVideos();
    return videos.reduce((total, video) => total + video.file.size, 0);
  }
}

export const videoStorage = new VideoStorage();
