import React, { useState, useRef, useEffect } from 'react';
import { Download, Check, Loader2, X, Trash2, HardDrive } from 'lucide-react';
import { useOffline } from '../context/OfflineContext';

interface DownloadButtonProps {
  lecture: {
    id: string;
    title: string;
    description?: string;
    batch_id: string;
    batch_title?: string;
    duration_seconds: number;
    sequence_order?: number;
    video_url: string;
  };
  variant?: 'pill' | 'icon';
  className?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  lecture,
  variant = 'pill',
  className = '',
}) => {
  const {
    isDownloaded,
    activeDownloads,
    downloadLecture,
    cancelDownload,
    deleteLecture,
    offlineLectures,
  } = useOffline();

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const downloaded = isDownloaded(lecture.id);
  const activeDownload = activeDownloads[lecture.id];
  const isDownloading = !!activeDownload?.isDownloading;
  const progressRatio = activeDownload?.progress || 0;
  const progressPercent = Math.round(progressRatio * 100);

  // Find saved file size if downloaded
  const savedRecord = offlineLectures.find((l) => l.id === lecture.id);
  const formattedSize = savedRecord
    ? `${(savedRecord.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
    : null;

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isDownloading) {
      if (confirm('Cancel this download?')) {
        cancelDownload(lecture.id);
      }
      return;
    }

    if (downloaded) {
      setShowMenu((prev) => !prev);
      return;
    }

    // Start download
    downloadLecture(lecture);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteLecture(lecture.id);
    setShowMenu(false);
  };

  if (variant === 'icon') {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={handleClick}
          title={
            isDownloading
              ? `Downloading ${progressPercent}% (Click to cancel)`
              : downloaded
              ? `Downloaded offline (${formattedSize || 'Saved'}). Click to manage.`
              : 'Download lecture for offline viewing'
          }
          className={`p-2 rounded-xl transition-all ${
            downloaded
              ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 bg-emerald-50/60'
              : isDownloading
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
              : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
          } ${className}`}
        >
          {isDownloading ? (
            <div className="relative w-4 h-4 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          ) : downloaded ? (
            <Check className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>

        {/* Dropdown Menu for Downloaded State */}
        {showMenu && downloaded && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-800">Saved for Offline</p>
              {formattedSize && (
                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-slate-400" /> {formattedSize}
                </p>
              )}
            </div>
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Download
            </button>
          </div>
        )}
      </div>
    );
  }

  // YouTube-Style Pill Button
  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleClick}
        className={`group relative overflow-hidden px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-xs ${
          downloaded
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300'
            : isDownloading
            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-transparent'
        } ${className}`}
      >
        {/* Background Progress Fill during downloading */}
        {isDownloading && (
          <div
            className="absolute inset-y-0 left-0 bg-blue-200/50 transition-all duration-300 pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />
        )}

        {isDownloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 relative z-10" />
            <span className="relative z-10">{progressPercent}% Downloading...</span>
            <X className="w-3.5 h-3.5 text-blue-500 hover:text-rose-600 relative z-10 ml-0.5" />
          </>
        ) : downloaded ? (
          <>
            <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-600" />
            <span>Downloaded</span>
            {formattedSize && (
              <span className="text-[10px] text-emerald-600/80 font-normal">
                ({formattedSize})
              </span>
            )}
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-colors" />
            <span>Download</span>
          </>
        )}
      </button>

      {/* Dropdown Menu when Downloaded */}
      {showMenu && downloaded && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Offline Available
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ready to watch without internet connection.
            </p>
            {formattedSize && (
              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                <HardDrive className="w-3 h-3 text-slate-400" /> Storage: {formattedSize}
              </div>
            )}
          </div>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove from Offline Downloads
          </button>
        </div>
      )}
    </div>
  );
};
