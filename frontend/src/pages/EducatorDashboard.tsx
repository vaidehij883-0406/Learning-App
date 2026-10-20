import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Batch, Lecture, Quiz } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UploadModal } from '../components/UploadModal';
import {
  Plus, Video, BookOpen, Users, Award, Trash2, Edit2,
  CheckCircle, Globe, Lock, ArrowRight, Share2, Sparkles, X, Check
} from 'lucide-react';

export const EducatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);

  // New batch form state
  const [newBatchTitle, setNewBatchTitle] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [newBatchCategory, setNewBatchCategory] = useState('Computer Science');
  const [newBatchThumbnail, setNewBatchThumbnail] = useState('');
  const [newBatchIsPublished, setNewBatchIsPublished] = useState(true);

  // New quiz form state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [quizPassingScore, setQuizPassingScore] = useState(60);
  const [quizTimeLimit, setQuizTimeLimit] = useState(15);
  const [quizQuestions, setQuizQuestions] = useState([
    {
      prompt: '',
      points: 10,
      options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ],
    },
  ]);

  const loadEducatorBatches = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBatches({ my_batches_only: true });
      setBatches(data);
      if (data.length > 0 && !selectedBatch) {
        setSelectedBatch(data[0]);
      }
    } catch (err) {
      console.error('Failed to load educator batches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEducatorBatches();
  }, []);

  const loadBatchContent = async (batchId: string) => {
    try {
      const [lList, qList] = await Promise.all([
        api.getLectures(batchId),
        api.getQuizzes(batchId),
      ]);
      setLectures(lList);
      setQuizzes(qList);
    } catch (err) {
      console.error('Failed to load batch content:', err);
    }
  };

  useEffect(() => {
    if (selectedBatch) {
      loadBatchContent(selectedBatch.id);
    }
  }, [selectedBatch]);

  // Handle Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createBatch({
        title: newBatchTitle.trim(),
        description: newBatchDesc.trim(),
        category: newBatchCategory,
        thumbnail_url: newBatchThumbnail.trim() || undefined,
        is_published: newBatchIsPublished,
      });
      setBatches((prev) => [created, ...prev]);
      setSelectedBatch(created);
      setShowCreateBatchModal(false);
      setNewBatchTitle('');
      setNewBatchDesc('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create batch');
    }
  };

  // Toggle Lecture Published
  const toggleLecturePublish = async (lec: Lecture) => {
    try {
      const updated = await api.updateLecture(lec.id, { is_published: !lec.is_published });
      setLectures((prev) => prev.map((l) => (l.id === lec.id ? updated : l)));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Lecture
  const handleDeleteLecture = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
    try {
      await api.deleteLecture(id);
      setLectures((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Create Quiz submit
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      const formattedQuestions = quizQuestions.map((q, idx) => ({
        prompt: q.prompt,
        sequence_order: idx + 1,
        points: q.points,
        options: q.options.map((opt, oIdx) => ({
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          sequence_order: oIdx + 1,
        })),
      }));

      await api.createQuiz({
        batch_id: selectedBatch.id,
        title: quizTitle.trim(),
        description: quizDesc.trim(),
        passing_score: quizPassingScore,
        time_limit_minutes: quizTimeLimit,
        max_attempts: 3,
        is_published: true,
        questions: formattedQuestions,
      });

      setShowCreateQuizModal(false);
      loadBatchContent(selectedBatch.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create quiz');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 text-left">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
            Instructor Studio
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Educator Course Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Build batches, upload video lectures, attach study notes, and design server-graded quizzes.
          </p>
        </div>

        <button
          onClick={() => setShowCreateBatchModal(true)}
          className="self-start sm:self-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create New Batch
        </button>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Col: Batches List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Your Batches ({batches.length})
          </h3>

          <div className="space-y-2">
            {batches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatch(b)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  selectedBatch?.id === b.id
                    ? 'bg-indigo-50/80 border-indigo-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{b.category}</span>
                  {b.is_published ? (
                    <span className="text-[10px] font-bold text-emerald-600">Published</span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600">Draft</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{b.title}</h4>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                  <span>{b.lectures_count} lectures</span>
                  <span>•</span>
                  <span>{b.enrolled_count} students</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right 3 Cols: Selected Batch Content Studio */}
        <div className="lg:col-span-3 space-y-6">
          {selectedBatch ? (
            <>
              {/* Batch Summary Bar */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Active Batch
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedBatch.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedBatch.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Upload Lecture
                  </button>

                  <button
                    onClick={() => setShowCreateQuizModal(true)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Award className="w-4 h-4" /> Create Quiz
                  </button>
                </div>
              </div>

              {/* Lectures List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    Lectures & Video Uploads ({lectures.length})
                  </h3>
                </div>

                {lectures.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    No lectures uploaded yet. Click "Upload Lecture" above to add your first video!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lectures.map((lec) => (
                      <div
                        key={lec.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {lec.sequence_order}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">{lec.title}</h4>
                              {lec.is_published ? (
                                <span className="px-2 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                                  Published
                                </span>
                              ) : (
                                <span className="px-2 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-full">
                                  Draft
                                </span>
                              )}
                              {lec.is_public_preview && (
                                <span className="px-2 py-0.2 text-[9px] font-bold bg-blue-100 text-blue-800 rounded-full">
                                  Public Preview
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{lec.description}</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                              <span>Duration: {Math.floor(lec.duration_seconds / 60)}m</span>
                              <span>•</span>
                              <span>{lec.resources.length} notes attached</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <Link
                            to={`/lecture/share/${lec.share_token}`}
                            target="_blank"
                            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white text-xs"
                            title="Preview Public Link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => toggleLecturePublish(lec)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              lec.is_published
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {lec.is_published ? 'Unpublish' : 'Publish'}
                          </button>

                          <button
                            onClick={() => handleDeleteLecture(lec.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Lecture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quizzes List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    Quizzes & Assessments ({quizzes.length})
                  </h3>
                </div>

                {quizzes.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No quizzes created yet for this batch.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quizzes.map((q) => (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{q.title}</h4>
                          <span className="text-[11px] text-slate-500">
                            Passing score: {q.passing_score}% • Limit: {q.time_limit_minutes}m
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-purple-600">Active</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-sm">
              Please select or create a batch to view its studio dashboard.
            </div>
          )}
        </div>

      </div>

      {/* Upload Lecture Modal */}
      {showUploadModal && selectedBatch && (
        <UploadModal
          batchId={selectedBatch.id}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(newLecture) => {
            setLectures((prev) => [...prev, newLecture]);
          }}
        />
      )}

      {/* Create Batch Modal */}
      {showCreateBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Create New Course Batch</h3>
              <button onClick={() => setShowCreateBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Title *</label>
                <input
                  type="text"
                  required
                  value={newBatchTitle}
                  onChange={(e) => setNewBatchTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems Masterclass"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  placeholder="Overview of what students will achieve..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newBatchCategory}
                  onChange={(e) => setNewBatchCategory(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Software Architecture">Software Architecture</option>
                  <option value="Backend Development">Backend Development</option>
                  <option value="Frontend Development">Frontend Development</option>
                  <option value="Mobile Development">Mobile Development</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thumbnail Image URL (Optional)</label>
                <input
                  type="url"
                  value={newBatchThumbnail}
                  onChange={(e) => setNewBatchThumbnail(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pub-batch"
                  checked={newBatchIsPublished}
                  onChange={(e) => setNewBatchIsPublished(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="pub-batch" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Publish batch for enrollment
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Quiz Modal */}
      {showCreateQuizModal && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Create Quiz for {selectedBatch.title}</h3>
              <button onClick={() => setShowCreateQuizModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quiz Title *</label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. System Design Architecture Quiz"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Passing Score (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quizPassingScore}
                    onChange={(e) => setQuizPassingScore(parseInt(e.target.value) || 60)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Limit (mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={quizTimeLimit}
                    onChange={(e) => setQuizTimeLimit(parseInt(e.target.value) || 15)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Questions & Options</h4>
                {quizQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <input
                      type="text"
                      required
                      placeholder={`Question ${qIdx + 1} Prompt...`}
                      value={q.prompt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuizQuestions((prev) =>
                          prev.map((item, i) => (i === qIdx ? { ...item, prompt: val } : item))
                        );
                      }}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    />

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={opt.is_correct}
                            onChange={() => {
                              setQuizQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIdx
                                    ? {
                                        ...item,
                                        options: item.options.map((o, oi) => ({
                                          ...o,
                                          is_correct: oi === oIdx,
                                        })),
                                      }
                                    : item
                                )
                              );
                            }}
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            required
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}...`}
                            value={opt.option_text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuizQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === qIdx
                                    ? {
                                        ...item,
                                        options: item.options.map((o, oi) =>
                                          oi === oIdx ? { ...o, option_text: val } : o
                                        ),
                                      }
                                    : item
                                )
                              );
                            }}
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                          {opt.is_correct && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateQuizModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Save & Publish Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
