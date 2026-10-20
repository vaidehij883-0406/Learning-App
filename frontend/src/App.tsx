import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { OfflineProvider } from './context/OfflineContext';
import { OfflineDownloadsModal } from './components/OfflineDownloadsModal';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ExplorePage } from './pages/ExplorePage';
import { BatchDetailPage } from './pages/BatchDetailPage';
import { PublicLecturePage } from './pages/PublicLecturePage';
import { LearnerDashboard } from './pages/LearnerDashboard';
import { EducatorDashboard } from './pages/EducatorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient();

// Protected Route wrappers
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <OfflineProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
                <Navbar />
                <main className="flex-1 flex flex-col">
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/batch/:id" element={<BatchDetailPage />} />
                    
                    {/* Critical: Public Lecture Share Link (Zero-Auth required) */}
                    <Route path="/lecture/share/:shareToken" element={<PublicLecturePage />} />

                    {/* Auth */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Protected Learner Dashboard */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <LearnerDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Educator Studio */}
                    <Route
                      path="/educator"
                      element={
                        <ProtectedRoute allowedRoles={['educator', 'admin']}>
                          <EducatorDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Admin Control */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* 404 Fallback */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </main>
                <Footer />
                <OfflineDownloadsModal />
              </div>
            </BrowserRouter>
          </OfflineProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
