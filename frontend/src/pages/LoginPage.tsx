import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const prefillEmail = searchParams.get('email');
    if (prefillEmail) {
      setEmail(prefillEmail);
      if (prefillEmail === 'educator@learnbatch.com') setPassword('EducatorPass123!');
      else if (prefillEmail === 'learner@learnbatch.com') setPassword('LearnerPass123!');
      else if (prefillEmail === 'vaidehij883@gmail.com' || prefillEmail === 'admin@learnbatch.com') setPassword('Vaidehi@123');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-slate-900">LearnBatch</span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
        <p className="text-xs text-slate-500 mt-1">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
            Sign up for free
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-3xl border border-slate-200/80 sm:px-10 text-left">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Instant Demo Fill
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('educator@learnbatch.com', 'EducatorPass123!')}
                className="w-full text-left p-2 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center justify-between transition-colors"
              >
                <span>Dr. Sarah Mitchell (Educator)</span>
                <span className="text-[10px] text-indigo-500 font-mono">Fill &gt;</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('learner@learnbatch.com', 'LearnerPass123!')}
                className="w-full text-left p-2 rounded-lg bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-between transition-colors"
              >
                <span>Alex Chen (Learner)</span>
                <span className="text-[10px] text-blue-500 font-mono">Fill &gt;</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('vaidehij883@gmail.com', 'Vaidehi@123')}
                className="w-full text-left p-2 rounded-lg bg-purple-50/70 hover:bg-purple-100 text-purple-700 text-xs font-medium flex items-center justify-between transition-colors"
              >
                <span>Vaidehi Joshi (Administrator)</span>
                <span className="text-[10px] text-purple-500 font-mono">Fill &gt;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
