import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LearningProgressSummary } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import {
  BookOpen, CheckCircle, Award, Clock, ArrowRight,
  Play, Compass, Flame, TrendingUp, Download, HardDrive, WifiOff, Trash2
} from 'lucide-react';

export const LearnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { offlineLectures, storageInfo, openDownloadsModal, deleteLecture, isOffline } = useOffline();
  const [summary, setSummary] = useState<LearningProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await api.getMyLearningProgress();
        setSummary(data);
      } catch (err) {
        console.error('Failed to load learning progress:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading your learning workspace...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 text-left">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.full_name || 'Learner'}!
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Track your batch courses, quiz performance, and resume from your exact saved position.
          </p>
        </div>

        <Link
          to="/explore"
          className="self-start sm:self-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Compass className="w-4 h-4" /> Explore More Batches
        </Link>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.enrolled_batches_count || 0}</div>
          <div className="text-xs text-slate-500 mt-0.5">Enrolled Batches</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.total_completed_lectures || 0}</div>
          <div className="text-xs text-slate-500 mt-0.5">Lectures Completed</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.quizzes_passed || 0}</div>
          <div className="text-xs text-slate-500 mt-0.5">Quizzes Passed</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.quizzes_attempted || 0}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Total Quiz Attempts</div>
        </div>
      </div>

      {/* Offline Mode Banner */}
      {isOffline && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">You are currently in Offline Mode</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                No active internet connection. You can watch your downloaded batch lectures anytime without connection.
              </p>
            </div>
          </div>
          <button
            onClick={openDownloadsModal}
            className="self-start sm:self-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
          >
            Open Downloads ({offlineLectures.length})
          </button>
        </div>
      )}

      {/* Offline Downloads Shelf (when lectures downloaded) */}
      {offlineLectures.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Offline Downloads</h2>
              <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                {offlineLectures.length} saved
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden sm:inline flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" /> {storageInfo.formatted} used
              </span>
              <button
                onClick={openDownloadsModal}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                Manage All →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offlineLectures.slice(0, 3).map((lec) => (
              <div
                key={lec.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between text-left group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {lec.batch_title || 'Course Batch'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {Math.floor(lec.duration_seconds / 60)}m
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {lec.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {lec.description || 'Saved offline video lecture.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    {(lec.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteLecture(lec.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove download"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to={`/batch/${lec.batch_id}`}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" /> Watch
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrolled Batches Section */}
      <div className="mb-12">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Your Enrolled Batches</h2>

        {summary?.batches.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">You haven't enrolled in any batches yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Explore public cohorts to watch structured lectures, get notes, and join peer discussions.
            </p>
            <Link
              to="/explore"
              className="mt-4 inline-block px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse Batches
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {summary?.batches.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {b.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-1">{b.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">By {b.educator_name}</p>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                      <span>Progress</span>
                      <span className="text-blue-600 font-bold">{b.progress_percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${b.progress_percentage}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {b.completed_lectures} of {b.total_lectures} lectures completed
                    </span>
                  </div>
                </div>

                {/* Continue button */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-600 truncate max-w-[180px]">
                    {b.next_lecture ? (
                      <span className="flex items-center gap-1">
                        <Play className="w-3 h-3 text-blue-600 shrink-0 fill-current" />
                        Next: {b.next_lecture.title}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">All lectures complete!</span>
                    )}
                  </div>

                  <Link
                    to={`/batch/${b.id}`}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    Resume <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Timeline */}
      {summary?.recent_activities && summary.recent_activities.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Learning Activity</h2>
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-xs">
            {summary.recent_activities.map((act) => (
              <div key={act.lecture_id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      act.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {act.completed ? <CheckCircle className="w-5 h-5" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{act.lecture_title}</h4>
                    <span className="text-[11px] text-slate-400">{act.batch_title}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {act.completed ? 'Completed' : `Paused at ${Math.floor(act.last_position_seconds / 60)}m`}
                  </span>
                  <Link
                    to={`/batch/${act.batch_id}`}
                    className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
