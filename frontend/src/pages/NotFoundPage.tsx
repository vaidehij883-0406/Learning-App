import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, AlertCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">Page Not Found</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-sm">
        The lecture, batch, or page you're searching for might have been moved or removed.
      </p>

      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <Home className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <Link
          to="/explore"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Compass className="w-3.5 h-3.5" /> Browse Batches
        </Link>
      </div>
    </div>
  );
};
