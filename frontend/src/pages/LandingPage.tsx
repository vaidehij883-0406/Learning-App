import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Batch } from '../types';
import { api } from '../api/client';
import { BatchCard } from '../components/BatchCard';
import {
  Compass, Sparkles, BookOpen, Video, FileText, CheckCircle,
  ArrowRight, Shield, Zap, Users, Play
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [featuredBatches, setFeaturedBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const data = await api.getBatches();
        setFeaturedBatches(data.slice(0, 3));
      } catch (err) {
        console.error('Failed to load batches:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBatches();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-blue-50/70 via-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold mb-6 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Modern Batch-Wise Education Platform</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-tight max-w-4xl mx-auto">
            Learn Together in Structured{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Live-Ready Batches
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Follow organized curricula, stream lectures with resume-progress synchronization,
            download companion PDF notes, and test your skills with server-graded quizzes.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/explore"
              className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Compass className="w-4 h-4" />
              Explore Public Batches
            </Link>

            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              Teach as an Educator
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>

          {/* Highlights banner */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Video className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Adaptive Video</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Resume playback on web & mobile</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">PDF Study Notes</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Downloadable companion notes</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Verified Quizzes</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Server-scored assessments</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Public Links</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Zero-auth lecture sharing</p>
            </div>
          </div>

        </div>
      </section>

      {/* Featured Batches Section */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Curated Courses
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                Featured Learning Batches
              </h2>
            </div>
            <Link
              to="/explore"
              className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Browse all batches <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : featuredBatches.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No published batches found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Demo Access Bar */}
      <section className="py-10 bg-slate-50 border-t border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-sm font-bold text-slate-900 mb-2">
            Instant Test Accounts for Evaluators
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Try LearnBatch as an Educator, Learner, or Administrator immediately without manual signup:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login?email=educator@learnbatch.com"
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Educator: Dr. Sarah Mitchell
            </Link>
            <Link
              to="/login?email=learner@learnbatch.com"
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Learner: Alex Chen
            </Link>
            <Link
              to="/login?email=vaidehij883@gmail.com"
              className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Admin: Vaidehi Joshi
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
