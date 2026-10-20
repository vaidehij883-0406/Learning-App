import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Batch, Lecture, Quiz } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { VideoPlayer } from '../components/VideoPlayer';
import { LectureCard } from '../components/LectureCard';
import { ChatDrawer } from '../components/ChatDrawer';
import { QuizModal } from '../components/QuizModal';
import { DownloadButton } from '../components/DownloadButton';
import { useOffline } from '../context/OfflineContext';
import {
  BookOpen, Users, Clock, Award, FileText, CheckCircle2,
  Share2, ArrowLeft, Download, Plus, MessageSquare, Check, Sparkles
} from 'lucide-react';

export const BatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isDownloaded, getOfflineBlobUrl } = useOffline();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'curriculum' | 'quizzes' | 'notes' | 'discussion'>('curriculum');
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isEducator = Boolean(user && batch && (user.id === batch.educator_id || user.role === 'admin'));

  const loadBatchData = async () => {
    if (!id) return;
    try {
      const [batchData, lecturesData] = await Promise.all([
        api.getBatch(id),
        api.getLectures(id),
      ]);
      setBatch(batchData);
      setLectures(lecturesData);

      // Default active lecture to first one or first incomplete
      if (lecturesData.length > 0 && !selectedLecture) {
        const firstIncomplete = lecturesData.find((l) => !l.user_progress?.completed);
        setSelectedLecture(firstIncomplete || lecturesData[0]);
      }

      if (batchData.is_enrolled || isEducator) {
        const quizzesData = await api.getQuizzes(id);
        setQuizzes(quizzesData);
      }
    } catch (err) {
      console.error('Failed to load batch:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatchData();
  }, [id, user]);

  useEffect(() => {
    if (selectedLecture && isDownloaded(selectedLecture.id)) {
      getOfflineBlobUrl(selectedLecture.id).then((url) => {
        if (url) setOfflineVideoUrl(url);
      });
    } else {
      setOfflineVideoUrl(null);
    }
  }, [selectedLecture, isDownloaded, getOfflineBlobUrl]);

  const handleEnroll = async () => {
    if (!id || !user) return;
    setIsEnrolling(true);
    try {
      await api.enrollBatch(id);
      await loadBatchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleProgressUpdate = async (position: number, duration: number) => {
    if (!selectedLecture || !user || !batch?.is_enrolled) return;
    try {
      const p = await api.saveProgress(selectedLecture.id, position, duration);
      // Update local state if completed
      if (p.completed && !selectedLecture.user_progress?.completed) {
        setLectures((prev) =>
          prev.map((l) =>
            l.id === selectedLecture.id
              ? { ...l, user_progress: { ...l.user_progress, completed: true, last_position_seconds: position } }
              : l
          )
        );
      }
    } catch (err) {
      console.error('Progress sync error:', err);
    }
  };

  if (isLoading || !batch) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading batch curriculum...
      </div>
    );
  }

  // Collect all notes across lectures
  const allNotes = lectures.flatMap((l) =>
    (l.resources || []).map((r) => ({ ...r, lecture_title: l.title }))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      {/* Back and Category */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/explore" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Batches
        </Link>
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700">
          {batch.category}
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Video Player & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {selectedLecture ? (
            <div className="space-y-4">
              <VideoPlayer
                key={selectedLecture.id}
                videoUrl={offlineVideoUrl || selectedLecture.video_url}
                posterUrl={selectedLecture.thumbnail_url}
                initialPositionSeconds={selectedLecture.user_progress?.last_position_seconds || 0}
                onProgressUpdate={handleProgressUpdate}
                title={selectedLecture.title}
                isOfflineSource={!!offlineVideoUrl}
              />

              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      Lecture {selectedLecture.sequence_order}
                    </span>
                    {selectedLecture.user_progress?.completed && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedLecture.title}</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedLecture.description}</p>
                </div>

                <div className="flex items-center gap-2 self-start shrink-0">
                  {/* YouTube-Style Offline Download Button */}
                  <DownloadButton
                    lecture={{
                      id: selectedLecture.id,
                      title: selectedLecture.title,
                      description: selectedLecture.description,
                      batch_id: batch.id,
                      batch_title: batch.title,
                      duration_seconds: selectedLecture.duration_seconds,
                      sequence_order: selectedLecture.sequence_order,
                      video_url: selectedLecture.video_url,
                    }}
                  />

                  <Link
                    to={`/lecture/share/${selectedLecture.share_token}`}
                    target="_blank"
                    className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors"
                    title="Open shareable public page"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-white">
              <p className="text-sm">Select a lecture below to start playing</p>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/50">
              <button
                onClick={() => setActiveTab('curriculum')}
                className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'curriculum'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Curriculum ({lectures.length})
              </button>

              <button
                onClick={() => setActiveTab('quizzes')}
                className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'quizzes'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4" />
                Quizzes & Tests ({quizzes.length})
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'notes'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Study Notes ({allNotes.length})
              </button>

              <button
                onClick={() => setActiveTab('discussion')}
                className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'discussion'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Discussion & Announcements
              </button>
            </div>

            {/* Tab Panes */}
            <div className="p-5 text-left">
              {activeTab === 'curriculum' && (
                <div className="space-y-3">
                  {lectures.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No lectures added yet to this batch.
                    </div>
                  ) : (
                    lectures.map((lec) => (
                      <LectureCard
                        key={lec.id}
                        lecture={lec}
                        isEnrolled={Boolean(batch.is_enrolled)}
                        isEducator={isEducator}
                        isActive={selectedLecture?.id === lec.id}
                        onSelect={() => setSelectedLecture(lec)}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'quizzes' && (
                <div className="space-y-3">
                  {quizzes.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No quizzes published for this batch.
                    </div>
                  ) : (
                    quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{quiz.title}</h4>
                            {quiz.passed && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> Passed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{quiz.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                            <span>Passing score: {quiz.passing_score}%</span>
                            <span>Limit: {quiz.time_limit_minutes} mins</span>
                            {quiz.best_score !== null && (
                              <span className="text-blue-600 font-semibold">
                                Best score: {quiz.best_score} pts
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveQuizId(quiz.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
                        >
                          {quiz.user_attempts_count > 0 ? 'Retake Quiz' : 'Start Quiz'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-3">
                  {allNotes.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No PDF notes uploaded for this batch yet.
                    </div>
                  ) : (
                    allNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{note.title}</div>
                            <div className="text-[11px] text-slate-400">Attached to: {note.lecture_title}</div>
                          </div>
                        </div>

                        <a
                          href={note.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'discussion' && (
                <ChatDrawer batchId={batch.id} isEducator={isEducator} />
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Batch Card, Educator Info, Enroll Button */}
        <div className="space-y-6 text-left">
          {/* Enroll / Membership card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h1 className="text-xl font-bold text-slate-950">{batch.title}</h1>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{batch.description}</p>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-500">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Language</span>
                <span className="font-semibold text-slate-800">{batch.language}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Access</span>
                <span className="font-semibold text-slate-800 capitalize">{batch.enrollment_type}</span>
              </div>
            </div>

            <div className="mt-6">
              {batch.is_enrolled ? (
                <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  You are Enrolled
                </div>
              ) : user ? (
                <button
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all"
                >
                  {isEnrolling ? 'Enrolling...' : 'Join Batch for Free'}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md text-center transition-all"
                >
                  Log in to Enroll
                </Link>
              )}
            </div>
          </div>

          {/* Educator card */}
          {batch.educator && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instructor</span>
              <div className="flex items-center gap-3 mt-3">
                {batch.educator.avatar_url ? (
                  <img
                    src={batch.educator.avatar_url}
                    alt={batch.educator.full_name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {batch.educator.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{batch.educator.full_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{batch.educator.bio || 'Verified Educator'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Quiz Modal */}
      {activeQuizId && (
        <QuizModal
          quizId={activeQuizId}
          onClose={() => setActiveQuizId(null)}
          onSuccess={() => loadBatchData()}
        />
      )}
    </div>
  );
};
