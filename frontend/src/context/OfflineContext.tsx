import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  offlineStorage,
  OfflineLectureSummary,
  OfflineLectureRecord,
} from '../services/offlineStorage';

interface ActiveDownloadState {
  progress: number;
  isDownloading: boolean;
}

interface OfflineContextType {
  isOffline: boolean;
  offlineLectures: OfflineLectureSummary[];
  activeDownloads: Record<string, ActiveDownloadState>;
  storageInfo: { bytes: number; formatted: string };
  isDownloaded: (lectureId: string) => boolean;
  getOfflineBlobUrl: (lectureId: string) => Promise<string | null>;
  downloadLecture: (lecture: {
    id: string;
    title: string;
    description?: string;
    batch_id: string;
    batch_title?: string;
    duration_seconds: number;
    sequence_order?: number;
    video_url: string;
  }) => Promise<void>;
  cancelDownload: (lectureId: string) => void;
  deleteLecture: (lectureId: string) => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  refreshDownloads: () => Promise<void>;
  isDownloadsModalOpen: boolean;
  openDownloadsModal: () => void;
  closeDownloadsModal: () => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [offlineLectures, setOfflineLectures] = useState<OfflineLectureSummary[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownloadState>>({});
  const [storageInfo, setStorageInfo] = useState<{ bytes: number; formatted: string }>({
    bytes: 0,
    formatted: '0.0 MB',
  });
  const [isDownloadsModalOpen, setIsDownloadsModalOpen] = useState(false);

  // Map of abort controllers for active downloads
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshDownloads = useCallback(async () => {
    try {
      const items = await offlineStorage.getAllOfflineLectures();
      setOfflineLectures(items);
      const storage = await offlineStorage.getTotalStorageUsed();
      setStorageInfo(storage);
    } catch (err) {
      console.warn('Could not refresh offline lectures:', err);
    }
  }, []);

  useEffect(() => {
    refreshDownloads();
  }, [refreshDownloads]);

  const isDownloaded = useCallback(
    (lectureId: string): boolean => {
      return offlineLectures.some((l) => l.id === lectureId);
    },
    [offlineLectures]
  );

  const getOfflineBlobUrl = useCallback(
    async (lectureId: string): Promise<string | null> => {
      return await offlineStorage.getOfflineBlobUrl(lectureId);
    },
    []
  );

  const downloadLecture = async (lecture: {
    id: string;
    title: string;
    description?: string;
    batch_id: string;
    batch_title?: string;
    duration_seconds: number;
    sequence_order?: number;
    video_url: string;
  }) => {
    if (!lecture.video_url) return;
    if (activeDownloads[lecture.id]?.isDownloading) return;

    const controller = new AbortController();
    abortControllersRef.current.set(lecture.id, controller);

    setActiveDownloads((prev) => ({
      ...prev,
      [lecture.id]: { progress: 0.01, isDownloading: true },
    }));

    try {
      await offlineStorage.saveLectureOffline(
        lecture,
        (progress) => {
          setActiveDownloads((prev) => ({
            ...prev,
            [lecture.id]: { progress, isDownloading: true },
          }));
        },
        controller.signal
      );

      abortControllersRef.current.delete(lecture.id);
      setActiveDownloads((prev) => {
        const next = { ...prev };
        delete next[lecture.id];
        return next;
      });

      await refreshDownloads();
    } catch (err: any) {
      abortControllersRef.current.delete(lecture.id);
      setActiveDownloads((prev) => {
        const next = { ...prev };
        delete next[lecture.id];
        return next;
      });
      if (err.name !== 'CanceledError' && err.message !== 'canceled') {
        console.error('Failed to download lecture offline:', err);
        alert(`Download failed: ${err.message || 'Could not save video to offline storage.'}`);
      }
    }
  };

  const cancelDownload = (lectureId: string) => {
    const controller = abortControllersRef.current.get(lectureId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(lectureId);
    }
    setActiveDownloads((prev) => {
      const next = { ...prev };
      delete next[lectureId];
      return next;
    });
  };

  const deleteLecture = async (lectureId: string) => {
    await offlineStorage.deleteOfflineLecture(lectureId);
    await refreshDownloads();
  };

  const clearAllDownloads = async () => {
    await offlineStorage.clearAllDownloads();
    await refreshDownloads();
  };

  return (
    <OfflineContext.Provider
      value={{
        isOffline,
        offlineLectures,
        activeDownloads,
        storageInfo,
        isDownloaded,
        getOfflineBlobUrl,
        downloadLecture,
        cancelDownload,
        deleteLecture,
        clearAllDownloads,
        refreshDownloads,
        isDownloadsModalOpen,
        openDownloadsModal: () => setIsDownloadsModalOpen(true),
        closeDownloadsModal: () => setIsDownloadsModalOpen(false),
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
