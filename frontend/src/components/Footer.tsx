import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-white border-t border-slate-200/80 py-10 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800 text-sm">LearnBatch</span>
            <span className="text-slate-400">© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/explore" className="hover:text-blue-600 transition-colors">Explore Batches</Link>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Educator Portal</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">Documentation</a>
            <div className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified Platform</span>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
