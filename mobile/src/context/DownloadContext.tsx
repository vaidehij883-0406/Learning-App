import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { downloadManager, DownloadedLecture } from '../services/downloadManager';

interface ActiveDownloadState {
  progress: number;
  isDownloading: boolean;
}

interface DownloadContextType {
  downloads: DownloadedLecture[];
  activeDownloads: Record<string, ActiveDownloadState>;
  storageInfo: { bytes: number; formatted: string };
  isDownloaded: (lectureId: string) => boolean;
  getLocalUri: (lectureId: string) => string | null;
  startDownload: (lecture: {
    id: string;
    title: string;
    description?: string;
    batch_id?: string;
    batch_title?: string;
    duration_seconds?: number;
    sequence_order?: number;
    video_url: string;
  }) => Promise<void>;
  cancelDownload: (lectureId: string) => Promise<void>;
  deleteDownload: (lectureId: string) => Promise<void>;
  refreshDownloads: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadedLecture[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownloadState>>({});
  const [storageInfo, setStorageInfo] = useState<{ bytes: number; formatted: string }>({
    bytes: 0,
    formatted: '0.0 MB',
  });

  const refreshDownloads = useCallback(async () => {
    try {
      const items = await downloadManager.getAllDownloads();
      setDownloads(items);
      const storage = await downloadManager.getTotalStorageUsed();
      setStorageInfo(storage);
    } catch (err) {
      console.warn('Failed to refresh downloads:', err);
    }
  }, []);

  useEffect(() => {
    refreshDownloads();
  }, [refreshDownloads]);

  const isDownloaded = useCallback(
    (lectureId: string): boolean => {
      return downloads.some((d) => d.id === lectureId);
    },
    [downloads]
  );

  const getLocalUri = useCallback(
    (lectureId: string): string | null => {
      const found = downloads.find((d) => d.id === lectureId);
      return found ? found.localUri : null;
    },
    [downloads]
  );

  const startDownload = async (lecture: {
    id: string;
    title: string;
    description?: string;
    batch_id?: string;
    batch_title?: string;
    duration_seconds?: number;
    sequence_order?: number;
    video_url: string;
  }) => {
    if (!lecture.video_url) {
      Alert.alert('Cannot Download', 'This lecture does not have an active video stream.');
      return;
    }

    if (activeDownloads[lecture.id]?.isDownloading) return;

    setActiveDownloads((prev) => ({
      ...prev,
      [lecture.id]: { progress: 0.01, isDownloading: true },
    }));

    try {
      await downloadManager.downloadLecture(lecture, (progress) => {
        setActiveDownloads((prev) => ({
          ...prev,
          [lecture.id]: { progress, isDownloading: true },
        }));
      });

      setActiveDownloads((prev) => {
        const next = { ...prev };
        delete next[lecture.id];
        return next;
      });

      await refreshDownloads();
    } catch (err: any) {
      setActiveDownloads((prev) => {
        const next = { ...prev };
        delete next[lecture.id];
        return next;
      });
      Alert.alert('Download Error', err.message || 'Failed to download lecture video.');
    }
  };

  const cancelDownload = async (lectureId: string) => {
    await downloadManager.cancelDownload(lectureId);
    setActiveDownloads((prev) => {
      const next = { ...prev };
      delete next[lectureId];
      return next;
    });
  };

  const deleteDownload = async (lectureId: string) => {
    await downloadManager.deleteDownload(lectureId);
    await refreshDownloads();
  };

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        activeDownloads,
        storageInfo,
        isDownloaded,
        getLocalUri,
        startDownload,
        cancelDownload,
        deleteDownload,
        refreshDownloads,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = () => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownloads must be used within a DownloadProvider');
  }
  return context;
};
