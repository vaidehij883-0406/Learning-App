import axios from 'axios';

export interface OfflineLectureRecord {
  id: string;
  title: string;
  description?: string;
  batch_id: string;
  batch_title?: string;
  duration_seconds: number;
  sequence_order?: number;
  video_blob: Blob;
  mime_type: string;
  file_size_bytes: number;
  downloaded_at: string;
}

export interface OfflineLectureSummary {
  id: string;
  title: string;
  description?: string;
  batch_id: string;
  batch_title?: string;
  duration_seconds: number;
  sequence_order?: number;
  mime_type: string;
  file_size_bytes: number;
  downloaded_at: string;
}

const DB_NAME = 'LearnBatchOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_lectures';

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not supported in this browser environment.'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('batch_id', 'batch_id', { unique: false });
          store.createIndex('downloaded_at', 'downloaded_at', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  public async isLectureDownloaded(lectureId: string): Promise<boolean> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.count(lectureId);
        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public async getOfflineLecture(lectureId: string): Promise<OfflineLectureRecord | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get(lectureId);
        req.onsuccess = () => resolve((req.result as OfflineLectureRecord) || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to get offline lecture from IndexedDB:', err);
      return null;
    }
  }

  public async getOfflineBlobUrl(lectureId: string): Promise<string | null> {
    const record = await this.getOfflineLecture(lectureId);
    if (!record || !record.video_blob) return null;
    return URL.createObjectURL(record.video_blob);
  }

  public async getAllOfflineLectures(): Promise<OfflineLectureSummary[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.openCursor();
        const results: OfflineLectureSummary[] = [];

        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const val = cursor.value as OfflineLectureRecord;
            results.push({
              id: val.id,
              title: val.title,
              description: val.description,
              batch_id: val.batch_id,
              batch_title: val.batch_title,
              duration_seconds: val.duration_seconds,
              sequence_order: val.sequence_order,
              mime_type: val.mime_type,
              file_size_bytes: val.file_size_bytes,
              downloaded_at: val.downloaded_at,
            });
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to retrieve offline lectures:', err);
      return [];
    }
  }

  public async saveLectureOffline(
    lecture: {
      id: string;
      title: string;
      description?: string;
      batch_id: string;
      batch_title?: string;
      duration_seconds: number;
      sequence_order?: number;
      video_url: string;
    },
    onProgress?: (ratio: number) => void,
    signal?: AbortSignal
  ): Promise<OfflineLectureRecord> {
    if (!lecture.video_url) {
      throw new Error('Video URL is missing or invalid.');
    }

    // 1. Fetch the video blob with progress tracking
    const response = await axios.get(lecture.video_url, {
      responseType: 'blob',
      signal,
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && progressEvent.total > 0 && onProgress) {
          const ratio = progressEvent.loaded / progressEvent.total;
          onProgress(Math.min(1, Math.max(0, ratio)));
        }
      },
    });

    const videoBlob: Blob = response.data;
    const mimeType = videoBlob.type || 'video/mp4';
    const fileSizeBytes = videoBlob.size;

    const record: OfflineLectureRecord = {
      id: lecture.id,
      title: lecture.title,
      description: lecture.description,
      batch_id: lecture.batch_id,
      batch_title: lecture.batch_title || 'Enrolled Course Batch',
      duration_seconds: lecture.duration_seconds || 0,
      sequence_order: lecture.sequence_order,
      video_blob: videoBlob,
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
      downloaded_at: new Date().toISOString(),
    };

    // 2. Save into IndexedDB
    const db = await this.initDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    if (onProgress) onProgress(1);
    return record;
  }

  public async deleteOfflineLecture(lectureId: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(lectureId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAllDownloads(): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getTotalStorageUsed(): Promise<{ bytes: number; formatted: string }> {
    const lectures = await this.getAllOfflineLectures();
    const totalBytes = lectures.reduce((acc, item) => acc + (item.file_size_bytes || 0), 0);
    const mb = totalBytes / (1024 * 1024);
    if (mb >= 1024) {
      return { bytes: totalBytes, formatted: `${(mb / 1024).toFixed(1)} GB` };
    }
    return { bytes: totalBytes, formatted: `${mb.toFixed(1)} MB` };
  }
}

export const offlineStorage = new OfflineStorageService();
