import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LecturePublic } from '../types';
import { api } from '../api/client';
import { VideoPlayer } from '../components/VideoPlayer';
import { DownloadButton } from '../components/DownloadButton';
import { useOffline } from '../context/OfflineContext';
import {
  Share2, Check, Download, FileText, ArrowLeft,
  GraduationCap, Calendar, Clock, AlertCircle, Sparkles
} from 'lucide-react';

export const PublicLecturePage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { isDownloaded, getOfflineBlobUrl } = useOffline();
  const [lecture, setLecture] = useState<LecturePublic | null>(null);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (lecture && isDownloaded(lecture.id)) {
      getOfflineBlobUrl(lecture.id).then((url) => {
        if (url) setOfflineVideoUrl(url);
      });
    } else {
      setOfflineVideoUrl(null);
    }
  }, [lecture, isDownloaded, getOfflineBlobUrl]);

  useEffect(() => {
    const fetchPublicLecture = async () => {
      if (!shareToken) return;
      setIsLoading(false);
      try {
        const data = await api.getPublicLecture(shareToken);
        setLecture(data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setErrorMessage('This lecture is currently in draft status and not available publicly.');
        } else {
          setErrorMessage('Lecture not found or the share link has expired.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicLecture();
  }, [shareToken]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-slate-500">Loading public lecture...</p>
      </div>
    );
  }

  if (errorMessage || !lecture) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2">{errorMessage || 'Unable to access this lecture.'}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/explore"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Explore Public Batches
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      {/* Top Breadcrumb & Share Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to={`/batch/${lecture.batch_id}`} className="hover:text-blue-600 flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            {lecture.batch_title}
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold truncate max-w-xs sm:max-w-md">
            Lecture {lecture.sequence_order}: {lecture.title}
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* YouTube-Style Offline Download Button */}
          <DownloadButton
            lecture={{
              id: lecture.id,
              title: lecture.title,
              description: lecture.description,
              batch_id: lecture.batch_id,
              batch_title: lecture.batch_title,
              duration_seconds: lecture.duration_seconds,
              sequence_order: lecture.sequence_order,
              video_url: lecture.video_url,
            }}
          />

          <button
            onClick={handleCopyLink}
            className={`px-4 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-blue-600'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Link Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Main Video Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Video Player */}
          <VideoPlayer
            videoUrl={offlineVideoUrl || lecture.video_url}
            posterUrl={lecture.thumbnail_url}
            title={lecture.title}
            isOfflineSource={!!offlineVideoUrl}
          />

          {/* Lecture Metadata */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700">
                {lecture.batch_category}
              </span>
              {lecture.subject && (
                <span className="text-xs text-slate-400 font-medium">
                  • {lecture.subject}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-950 tracking-tight">
              {lecture.title}
            </h1>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {lecture.description || 'No description provided for this lecture.'}
            </p>

            {/* Educator profile card */}
            {lecture.educator && (
              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
                {lecture.educator.avatar_url ? (
                  <img
                    src={lecture.educator.avatar_url}
                    alt={lecture.educator.full_name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {lecture.educator.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{lecture.educator.full_name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{lecture.educator.bio || 'Course Educator'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Notes and Batch Callout */}
        <div className="space-y-6 text-left">
          {/* PDF Notes Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-blue-600" />
              Attached PDF Notes ({lecture.resources.length})
            </h3>

            {lecture.resources.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No study notes attached to this lecture.
              </div>
            ) : (
              <div className="space-y-2.5">
                {lecture.resources.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 truncate">{res.title}</div>
                        <div className="text-[10px] text-slate-400">PDF Document</div>
                      </div>
                    </div>

                    <a
                      href={res.file_url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors shrink-0"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Explore full batch banner */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              Full Course Batch
            </div>
            <h4 className="text-base font-bold text-white">{lecture.batch_title}</h4>
            <p className="text-xs text-blue-100/90 mt-2 leading-relaxed">
              Join this batch to track your progress, take interactive quizzes, and discuss questions with the educator and fellow learners.
            </p>
            <Link
              to={`/batch/${lecture.batch_id}`}
              className="mt-4 block w-full text-center py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              View Full Batch Curriculum
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
