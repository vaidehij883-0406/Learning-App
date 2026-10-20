import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Download, Play, Trash2, HardDrive, WifiOff,
  Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useOffline } from '../context/OfflineContext';

export const OfflineDownloadsModal: React.FC = () => {
  const {
    isDownloadsModalOpen,
    closeDownloadsModal,
    offlineLectures,
    storageInfo,
    deleteLecture,
    clearAllDownloads,
    isOffline,
  } = useOffline();

  const navigate = useNavigate();

  if (!isDownloadsModalOpen) return null;

  const handlePlayLecture = (lecture: any) => {
    closeDownloadsModal();
    navigate(`/batch/${lecture.batch_id}`);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all offline downloaded lectures? This will free up storage.')) {
      clearAllDownloads();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Offline Downloads</h2>
              <p className="text-xs text-slate-500">
                Lectures saved locally in your browser for offline viewing
              </p>
            </div>
          </div>
          <button
            onClick={closeDownloadsModal}
            className="w-8 h-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Network & Storage Summary Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Storage Used: <strong className="text-slate-900">{storageInfo.formatted}</strong></span>
            <span className="text-slate-300">•</span>
            <span>{offlineLectures.length} lecture{offlineLectures.length === 1 ? '' : 's'} available</span>
          </div>

          {offlineLectures.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-rose-600 hover:text-rose-700 hover:underline font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>

        {/* Offline Banner when user has no internet connection */}
        {isOffline && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>You are offline.</strong> Don't worry, all downloaded lectures below can be watched without internet!
            </span>
          </div>
        )}

        {/* Downloads List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {offlineLectures.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Offline Downloads Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Whenever you see a lecture with a <strong>Download</strong> button, tap it to save it locally. You will then be able to watch it anytime without needing internet.
              </p>
            </div>
          ) : (
            offlineLectures.map((lec) => {
              const mb = (lec.file_size_bytes / (1024 * 1024)).toFixed(1);
              const durationMins = Math.floor(lec.duration_seconds / 60);

              return (
                <div
                  key={lec.id}
                  className="bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs group"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {lec.batch_title || 'Enrolled Course'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate mt-1">
                        {lec.sequence_order ? `Lecture ${lec.sequence_order}: ` : ''}{lec.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {durationMins} mins
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-slate-400" /> {mb} MB
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Offline Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handlePlayLecture(lec)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch
                    </button>
                    <button
                      onClick={() => deleteLecture(lec.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Remove download"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>Downloaded media is stored securely in your browser cache</span>
          <button
            onClick={closeDownloadsModal}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
