import React, { useState, useEffect } from 'react';
import { Quiz, QuizAttemptResult } from '../types';
import { api } from '../api/client';
import {
  X, CheckCircle2, XCircle, Clock, Award, AlertTriangle,
  RotateCcw, ArrowRight, Check
} from 'lucide-react';

interface QuizModalProps {
  quizId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ quizId, onClose, onSuccess }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const q = await api.getQuiz(quizId);
        setQuiz(q);
        if (q.time_limit_minutes) {
          setTimeLeftSeconds(q.time_limit_minutes * 60);
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.detail || 'Failed to load quiz');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeftSeconds === null || timeLeftSeconds <= 0 || result) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Auto submit when time expires
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSeconds, result]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (result) return; // Locked once evaluated
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!quiz || isSubmitting) return;

    const answersArray = Object.entries(selectedAnswers).map(([question_id, selected_option_id]) => ({
      question_id,
      selected_option_id,
    }));

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.submitQuizAttempt(quiz.id, answersArray);
      setResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error submitting quiz attempt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Assessment
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              {quiz?.title || 'Loading Quiz...'}
            </h3>
          </div>

          <div className="flex items-center gap-4">
            {timeLeftSeconds !== null && !result && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                {formatTimer(timeLeftSeconds)}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading quiz questions...</div>
          ) : errorMsg && !result ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          ) : result ? (
            /* Results Screen */
            <div className="space-y-6">
              <div
                className={`p-6 rounded-2xl text-center border ${
                  result.passed
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <div
                  className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3 ${
                    result.passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}
                >
                  <Award className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-black">
                  {result.passed ? 'Congratulations, You Passed!' : 'Assessment Incomplete'}
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  You scored <span className="font-bold text-slate-900">{result.score}</span> out of{' '}
                  <span className="font-bold text-slate-900">{result.max_score}</span> points (
                  {result.percentage}%). Required passing score: {quiz?.passing_score}%.
                </p>

                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
                  <span>Attempts remaining: <strong className="text-slate-800">{result.attempts_remaining}</strong></span>
                </div>
              </div>

              {/* Question breakdown */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question Breakdown & Verified Answers
                </h5>
                {result.breakdown.map((item, idx) => (
                  <div
                    key={item.question_id}
                    className={`p-4 rounded-xl border text-left ${
                      item.is_correct ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {idx + 1}. {item.prompt}
                      </span>
                      {item.is_correct ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> +{item.points_earned} pts
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full flex items-center gap-1 shrink-0">
                          <XCircle className="w-3 h-3 text-rose-600" /> 0 pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Question List */
            <div className="space-y-6">
              {quiz?.description && (
                <p className="text-xs text-slate-500 leading-relaxed">{quiz.description}</p>
              )}

              {quiz?.questions?.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/30 text-left">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
                    <span>Question {idx + 1} of {quiz.questions?.length}</span>
                    <span>{q.points} points</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">{q.prompt}</h4>

                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          className={`w-full text-left p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-500'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span>{opt.option_text}</span>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          {result ? (
            <div className="w-full flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>

              {result.attempts_remaining > 0 && (
                <button
                  onClick={() => {
                    setResult(null);
                    setSelectedAnswers({});
                    if (quiz?.time_limit_minutes) setTimeLeftSeconds(quiz.time_limit_minutes * 60);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake Quiz ({result.attempts_remaining} left)
                </button>
              )}
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Answered {Object.keys(selectedAnswers).length} of {quiz?.questions?.length || 0}
              </span>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || Object.keys(selectedAnswers).length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? 'Evaluating Score...' : 'Submit Answers'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
