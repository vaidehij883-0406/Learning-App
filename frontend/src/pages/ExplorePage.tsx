import React, { useState, useEffect } from 'react';
import { Batch } from '../types';
import { api } from '../api/client';
import { BatchCard } from '../components/BatchCard';
import { Search, Filter, BookOpen, Layers } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    'All',
    'Computer Science',
    'Software Architecture',
    'Backend Development',
    'Frontend Development',
    'Mobile Development',
  ];

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBatches({
        search: search.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
      });
      setBatches(data);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBatches();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      {/* Header */}
      <div className="max-w-3xl mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Explore Learning Batches
        </h1>
        <p className="text-slate-600 text-sm mt-2">
          Discover structured cohorts led by experienced educators. Watch free preview lectures or enroll to access the full curriculum and assignments.
        </p>
      </div>

      {/* Search & Categories Bar */}
      <div className="space-y-4 mb-8">
        <div className="relative max-w-lg">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by batch title, topic, or technology..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto my-12">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No batches found</h3>
          <p className="text-xs text-slate-500 mt-1">
            We couldn't find any batches matching "{search}". Try searching for another topic or reset the category filter.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('All');
            }}
            className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl hover:bg-blue-100 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      )}
    </div>
  );
};
