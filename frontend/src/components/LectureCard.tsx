import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lecture } from '../types';
import { DownloadButton } from './DownloadButton';
import { Play, CheckCircle2, Clock, FileText, Share2, Check, Lock } from 'lucide-react';

interface LectureCardProps {
  lecture: Lecture;
  isEnrolled: boolean;
  isEducator: boolean;
  onSelect?: () => void;
  isActive?: boolean;
}

export const LectureCard: React.FC<LectureCardProps> = ({
  lecture,
  isEnrolled,
  isEducator,
  onSelect,
  isActive = false,
}) => {
  const [copied, setCopied] = useState(false);

  const canAccess = isEducator || isEnrolled || lecture.is_public_preview;

  const copyShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const shareUrl = `${window.location.origin}/lecture/share/${lecture.share_token}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div
      onClick={canAccess ? onSelect : undefined}
      className={`relative p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
        isActive
          ? 'bg-blue-50/70 border-blue-500 shadow-sm'
          : canAccess
          ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer'
          : 'bg-slate-50/70 border-slate-200 opacity-70 cursor-not-allowed'
      }`}
    >
      {/* Sequence order pill */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
          lecture.user_progress?.completed
            ? 'bg-emerald-100 text-emerald-700'
            : isActive
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
            : canAccess
            ? 'bg-slate-100 text-slate-700'
            : 'bg-slate-200 text-slate-400'
        }`}
      >
        {lecture.user_progress?.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : canAccess ? (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        ) : (
          <Lock className="w-4 h-4 text-slate-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Lecture {lecture.sequence_order}
          </span>

          {lecture.is_public_preview && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/50">
              Free Preview
            </span>
          )}

          {!lecture.is_published && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-200/50">
              Draft
            </span>
          )}
        </div>

        <h4 className={`text-sm font-semibold mt-1 truncate ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>
          {lecture.title}
        </h4>

        {lecture.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{lecture.description}</p>
        )}

        <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(lecture.duration_seconds)}
          </span>

          {lecture.resources && lecture.resources.length > 0 && (
            <span className="flex items-center gap-1 text-slate-500 font-medium">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              {lecture.resources.length} {lecture.resources.length === 1 ? 'note' : 'notes'}
            </span>
          )}

          {lecture.user_progress && lecture.user_progress.last_position_seconds > 0 && !lecture.user_progress.completed && (
            <span className="text-blue-600 font-medium">
              Resumes at {Math.floor(lecture.user_progress.last_position_seconds / 60)}m
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {canAccess && (
          <DownloadButton
            variant="icon"
            lecture={{
              id: lecture.id,
              title: lecture.title,
              description: lecture.description,
              batch_id: lecture.batch_id,
              duration_seconds: lecture.duration_seconds,
              sequence_order: lecture.sequence_order,
              video_url: lecture.video_url,
            }}
          />
        )}

        {/* Share public link button */}
        {lecture.is_published && (
          <button
            onClick={copyShareLink}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1 transition-all ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-blue-600'
            }`}
            title="Copy shareable public lecture link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
