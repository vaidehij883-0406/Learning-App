import React from 'react';
import { Link } from 'react-router-dom';
import { Batch } from '../types';
import { BookOpen, Users, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface BatchCardProps {
  batch: Batch;
  progressPercentage?: number;
}

export const BatchCard: React.FC<BatchCardProps> = ({ batch, progressPercentage }) => {
  const defaultThumbnail = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-500/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <img
          src={batch.thumbnail_url || defaultThumbnail}
          alt={batch.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white/90 backdrop-blur-md text-blue-700 shadow-sm">
            {batch.category}
          </span>
          {batch.language && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-black/60 text-white backdrop-blur-sm">
              {batch.language}
            </span>
          )}
        </div>

        {batch.is_enrolled && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-500 text-white shadow-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {batch.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {batch.description || 'Structured lecture series designed for learners of all levels.'}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          {/* Educator details */}
          <div className="flex items-center gap-2 mb-3">
            {batch.educator?.avatar_url ? (
              <img
                src={batch.educator.avatar_url}
                alt={batch.educator.full_name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                {batch.educator?.full_name?.charAt(0) || 'E'}
              </div>
            )}
            <span className="text-xs text-slate-700 font-medium line-clamp-1">
              {batch.educator?.full_name || 'Educator'}
            </span>
          </div>

          {/* Progress bar if enrolled and progress is provided */}
          {progressPercentage !== undefined && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                <span>Progress</span>
                <span className="text-blue-600 font-semibold">{progressPercentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Bottom stats & CTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <span className="flex items-center gap-1" title="Lectures">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                {batch.lectures_count} lectures
              </span>
              <span className="flex items-center gap-1" title="Enrolled students">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {batch.enrolled_count}
              </span>
            </div>

            <Link
              to={`/batch/${batch.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 group-hover:translate-x-0.5 transition-all"
            >
              {batch.is_enrolled ? 'Continue' : 'View Batch'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
