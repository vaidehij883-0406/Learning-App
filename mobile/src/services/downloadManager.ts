import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface DownloadedLecture {
  id: string;
  title: string;
  description?: string;
  batchId: string;
  batchTitle?: string;
  durationSeconds: number;
  sequenceOrder?: number;
  localUri: string;
  fileSizeBytes: number;
  downloadedAt: string;
}

const DOWNLOAD_DIR = `${FileSystem.documentDirectory || ''}downloads/`;
const METADATA_FILE = `${DOWNLOAD_DIR}metadata.json`;

// Active download resumable objects mapped by lecture id
const activeDownloadsMap = new Map<string, FileSystem.DownloadResumable>();

class DownloadManager {
  private isInitialized = false;

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      if (FileSystem.documentDirectory) {
        const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
        }
        const metaInfo = await FileSystem.getInfoAsync(METADATA_FILE);
        if (!metaInfo.exists) {
          await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify([]));
        }
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('Failed to initialize download storage directory:', err);
    }
  }

  private async readMetadata(): Promise<DownloadedLecture[]> {
    await this.init();
    try {
      if (!FileSystem.documentDirectory) return [];
      const content = await FileSystem.readAsStringAsync(METADATA_FILE);
      return JSON.parse(content) as DownloadedLecture[];
    } catch (err) {
      return [];
    }
  }

  private async writeMetadata(items: DownloadedLecture[]): Promise<void> {
    await this.init();
    try {
      if (!FileSystem.documentDirectory) return;
      await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(items, null, 2));
    } catch (err) {
      console.error('Failed to write download metadata:', err);
    }
  }

  public async getAllDownloads(): Promise<DownloadedLecture[]> {
    const list = await this.readMetadata();
    // Verify files still exist on disk
    const validList: DownloadedLecture[] = [];
    for (const item of list) {
      try {
        const info = await FileSystem.getInfoAsync(item.localUri);
        if (info.exists) {
          validList.push({
            ...item,
            fileSizeBytes: info.size || item.fileSizeBytes,
          });
        }
      } catch {
        // If file check fails, ignore
      }
    }

    if (validList.length !== list.length) {
      await this.writeMetadata(validList);
    }

    return validList;
  }

  public async isLectureDownloaded(lectureId: string): Promise<boolean> {
    const list = await this.readMetadata();
    const found = list.find((d) => d.id === lectureId);
    if (!found) return false;
    try {
      const info = await FileSystem.getInfoAsync(found.localUri);
      return info.exists;
    } catch {
      return false;
    }
  }

  public async getLocalUri(lectureId: string): Promise<string | null> {
    const list = await this.readMetadata();
    const found = list.find((d) => d.id === lectureId);
    if (!found) return null;
    try {
      const info = await FileSystem.getInfoAsync(found.localUri);
      return info.exists ? found.localUri : null;
    } catch {
      return null;
    }
  }

  public async downloadLecture(
    lecture: {
      id: string;
      title: string;
      description?: string;
      batch_id?: string;
      batch_title?: string;
      duration_seconds?: number;
      sequence_order?: number;
      video_url: string;
    },
    onProgress: (progress: number) => void
  ): Promise<DownloadedLecture> {
    await this.init();

    if (!FileSystem.documentDirectory) {
      throw new Error('Local file system storage not available on this platform.');
    }

    const localFileUri = `${DOWNLOAD_DIR}lecture_${lecture.id}.mp4`;

    // Remove existing file if any
    try {
      await FileSystem.deleteAsync(localFileUri, { idempotent: true });
    } catch {}

    const downloadResumable = FileSystem.createDownloadResumable(
      lecture.video_url,
      localFileUri,
      {},
      (downloadProgress) => {
        if (downloadProgress.totalBytesExpectedToWrite > 0) {
          const ratio = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress(Math.min(1, Math.max(0, ratio)));
        }
      }
    );

    activeDownloadsMap.set(lecture.id, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      activeDownloadsMap.delete(lecture.id);

      if (!result || !result.uri) {
        throw new Error('Download failed: file was not saved.');
      }

      const fileInfo = await FileSystem.getInfoAsync(result.uri);

      const newRecord: DownloadedLecture = {
        id: lecture.id,
        title: lecture.title,
        description: lecture.description,
        batchId: lecture.batch_id || '',
        batchTitle: lecture.batch_title || 'Enrolled Batch',
        durationSeconds: lecture.duration_seconds || 0,
        sequenceOrder: lecture.sequence_order,
        localUri: result.uri,
        fileSizeBytes: fileInfo.exists ? fileInfo.size : 0,
        downloadedAt: new Date().toISOString(),
      };

      const existing = await this.readMetadata();
      const updated = existing.filter((item) => item.id !== lecture.id);
      updated.unshift(newRecord);
      await this.writeMetadata(updated);

      onProgress(1);
      return newRecord;
    } catch (err) {
      activeDownloadsMap.delete(lecture.id);
      try {
        await FileSystem.deleteAsync(localFileUri, { idempotent: true });
      } catch {}
      throw err;
    }
  }

  public async cancelDownload(lectureId: string): Promise<void> {
    const resumable = activeDownloadsMap.get(lectureId);
    if (resumable) {
      try {
        await resumable.pauseAsync();
      } catch {}
      activeDownloadsMap.delete(lectureId);
    }
    const localFileUri = `${DOWNLOAD_DIR}lecture_${lectureId}.mp4`;
    try {
      await FileSystem.deleteAsync(localFileUri, { idempotent: true });
    } catch {}
  }

  public async deleteDownload(lectureId: string): Promise<void> {
    const list = await this.readMetadata();
    const item = list.find((d) => d.id === lectureId);
    if (item) {
      try {
        await FileSystem.deleteAsync(item.localUri, { idempotent: true });
      } catch {}
      const updated = list.filter((d) => d.id !== lectureId);
      await this.writeMetadata(updated);
    }
  }

  public async getTotalStorageUsed(): Promise<{ bytes: number; formatted: string }> {
    const downloads = await this.getAllDownloads();
    const totalBytes = downloads.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0);

    const mb = totalBytes / (1024 * 1024);
    if (mb >= 1024) {
      return { bytes: totalBytes, formatted: `${(mb / 1024).toFixed(1)} GB` };
    }
    return { bytes: totalBytes, formatted: `${mb.toFixed(1)} MB` };
  }
}

export const downloadManager = new DownloadManager();
