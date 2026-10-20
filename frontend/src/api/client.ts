import axios from 'axios';
import {
  AuthResponse, User, Batch, Lecture, LecturePublic,
  Quiz, QuizAttemptResult, ChatMessage, Announcement,
  NotificationItem, LearningProgressSummary
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('learnbatch_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Methods
export const api = {
  // Auth
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  async register(data: { email: string; password: string; full_name: string; role: string; bio?: string }): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const res = await apiClient.put<User>('/auth/me', data);
    return res.data;
  },

  // Batches
  async getBatches(params?: { search?: string; category?: string; my_batches_only?: boolean }): Promise<Batch[]> {
    const res = await apiClient.get<Batch[]>('/batches', { params });
    return res.data;
  },

  async getBatch(id: string): Promise<Batch> {
    const res = await apiClient.get<Batch>(`/batches/${id}`);
    return res.data;
  },

  async createBatch(data: Partial<Batch>): Promise<Batch> {
    const res = await apiClient.post<Batch>('/batches', data);
    return res.data;
  },

  async updateBatch(id: string, data: Partial<Batch>): Promise<Batch> {
    const res = await apiClient.put<Batch>(`/batches/${id}`, data);
    return res.data;
  },

  async deleteBatch(id: string): Promise<void> {
    await apiClient.delete(`/batches/${id}`);
  },

  async enrollBatch(id: string): Promise<any> {
    const res = await apiClient.post(`/batches/${id}/enroll`);
    return res.data;
  },

  // Lectures
  async getLectures(batchId: string): Promise<Lecture[]> {
    const res = await apiClient.get<Lecture[]>('/lectures', { params: { batch_id: batchId } });
    return res.data;
  },

  async getLecture(id: string): Promise<Lecture> {
    const res = await apiClient.get<Lecture>(`/lectures/${id}`);
    return res.data;
  },

  async getPublicLecture(shareToken: string): Promise<LecturePublic> {
    const res = await apiClient.get<LecturePublic>(`/lectures/share/${shareToken}`);
    return res.data;
  },

  async createLecture(data: Partial<Lecture>): Promise<Lecture> {
    const res = await apiClient.post<Lecture>('/lectures', data);
    return res.data;
  },

  async updateLecture(id: string, data: Partial<Lecture>): Promise<Lecture> {
    const res = await apiClient.put<Lecture>(`/lectures/${id}`, data);
    return res.data;
  },

  async deleteLecture(id: string): Promise<void> {
    await apiClient.delete(`/lectures/${id}`);
  },

  async saveProgress(lectureId: string, positionSeconds: number, durationSeconds?: number): Promise<any> {
    const res = await apiClient.post(`/lectures/${lectureId}/progress`, {
      position_seconds: Math.floor(positionSeconds),
      duration_seconds: durationSeconds ? Math.floor(durationSeconds) : undefined,
    });
    return res.data;
  },

  async addResource(lectureId: string, data: { title: string; file_url: string; file_size_bytes?: number }): Promise<any> {
    const res = await apiClient.post(`/lectures/${lectureId}/resources`, data);
    return res.data;
  },

  async deleteResource(lectureId: string, resourceId: string): Promise<void> {
    await apiClient.delete(`/lectures/${lectureId}/resources/${resourceId}`);
  },

  // Quizzes
  async getQuizzes(batchId: string): Promise<Quiz[]> {
    const res = await apiClient.get<Quiz[]>('/quizzes', { params: { batch_id: batchId } });
    return res.data;
  },

  async getQuiz(id: string): Promise<Quiz> {
    const res = await apiClient.get<Quiz>(`/quizzes/${id}`);
    return res.data;
  },

  async createQuiz(data: any): Promise<Quiz> {
    const res = await apiClient.post<Quiz>('/quizzes', data);
    return res.data;
  },

  async submitQuizAttempt(quizId: string, answers: Array<{ question_id: string; selected_option_id: string }>): Promise<QuizAttemptResult> {
    const res = await apiClient.post<QuizAttemptResult>(`/quizzes/${quizId}/attempt`, { answers });
    return res.data;
  },

  async deleteQuiz(id: string): Promise<void> {
    await apiClient.delete(`/quizzes/${id}`);
  },

  // Progress
  async getMyLearningProgress(): Promise<LearningProgressSummary> {
    const res = await apiClient.get<LearningProgressSummary>('/progress/my-learning');
    return res.data;
  },

  // Chat & Announcements
  async getBatchMessages(batchId: string): Promise<ChatMessage[]> {
    const res = await apiClient.get<ChatMessage[]>(`/batches/${batchId}/messages`);
    return res.data;
  },

  async sendMessage(batchId: string, message: string, isAnnouncement = false): Promise<ChatMessage> {
    const res = await apiClient.post<ChatMessage>(`/batches/${batchId}/messages`, {
      message,
      is_announcement: isAnnouncement,
    });
    return res.data;
  },

  async getAnnouncements(batchId: string): Promise<Announcement[]> {
    const res = await apiClient.get<Announcement[]>(`/batches/${batchId}/announcements`);
    return res.data;
  },

  async createAnnouncement(batchId: string, title: string, content: string): Promise<Announcement> {
    const res = await apiClient.post<Announcement>(`/batches/${batchId}/announcements`, { title, content });
    return res.data;
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await apiClient.get<NotificationItem[]>('/notifications');
    return res.data;
  },

  async markNotificationRead(id: string): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.put('/notifications/read-all');
  },

  // Uploads
  async getPresignedUrl(filename: string, fileType: string, bucket = 'media'): Promise<any> {
    const res = await apiClient.post('/uploads/presigned-url', { filename, file_type: fileType, bucket });
    return res.data;
  },

  async uploadDirect(file: File, bucket = 'media', onProgress?: (pct: number) => void): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/uploads/direct?bucket=${bucket}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      },
    });
    return res.data.file_url;
  },

  // Admin
  async getAdminStats(): Promise<any> {
    const res = await apiClient.get('/admin/stats');
    return res.data;
  },

  async getAdminUsers(role?: string): Promise<User[]> {
    const res = await apiClient.get<User[]>('/admin/users', { params: { role } });
    return res.data;
  },

  async updateUserRole(userId: string, role: string): Promise<User> {
    const res = await apiClient.put<User>(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  async getAdminReports(): Promise<any[]> {
    const res = await apiClient.get('/admin/reports');
    return res.data;
  },

  async updateReportStatus(reportId: string, status: string): Promise<any> {
    const res = await apiClient.put(`/admin/reports/${reportId}`, { status });
    return res.data;
  },
};
