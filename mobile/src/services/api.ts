import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// For Android emulator, 10.0.2.2 maps to the host's localhost. For physical devices, LAN IP is used.
export const BASE_API_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api/v1',
  ios: 'http://localhost:8000/api/v1',
  default: 'http://localhost:8000/api/v1',
});

const TOKEN_KEY = 'learnbatch_mobile_token';

export const apiClient = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach token
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    // Web fallback or storage error
  }
  return config;
});

export const mobileStorage = {
  async saveToken(token: string) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (err) {
      // SecureStore not available on web fallback
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TOKEN_KEY, token);
      }
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (err) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(TOKEN_KEY);
      }
      return null;
    }
  },

  async deleteToken() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (err) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    }
  },
};

export const mobileApi = {
  async login(credentials: { email: string; password: string }) {
    const res = await apiClient.post('/auth/login', credentials);
    await mobileStorage.saveToken(res.data.access_token);
    return res.data;
  },

  async register(data: { email: string; password: string; full_name: string; role: string; bio?: string }) {
    const res = await apiClient.post('/auth/register', data);
    await mobileStorage.saveToken(res.data.access_token);
    return res.data;
  },

  async getMe() {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  async getBatches(params?: { search?: string; category?: string; my_batches_only?: boolean }) {
    const res = await apiClient.get('/batches', { params });
    return res.data;
  },

  async getBatch(id: string) {
    const res = await apiClient.get(`/batches/${id}`);
    return res.data;
  },

  async enrollBatch(id: string) {
    const res = await apiClient.post(`/batches/${id}/enroll`);
    return res.data;
  },

  async getLectures(batchId: string) {
    const res = await apiClient.get('/lectures', { params: { batch_id: batchId } });
    return res.data;
  },

  async getLecture(id: string) {
    const res = await apiClient.get(`/lectures/${id}`);
    return res.data;
  },

  async getPublicLecture(shareToken: string) {
    const res = await apiClient.get(`/lectures/share/${shareToken}`);
    return res.data;
  },

  async saveProgress(lectureId: string, positionSeconds: number, durationSeconds?: number) {
    const res = await apiClient.post(`/lectures/${lectureId}/progress`, {
      position_seconds: Math.floor(positionSeconds),
      duration_seconds: durationSeconds ? Math.floor(durationSeconds) : undefined,
    });
    return res.data;
  },

  async getQuizzes(batchId: string) {
    const res = await apiClient.get('/quizzes', { params: { batch_id: batchId } });
    return res.data;
  },

  async getQuiz(id: string) {
    const res = await apiClient.get(`/quizzes/${id}`);
    return res.data;
  },

  async submitQuizAttempt(quizId: string, answers: Array<{ question_id: string; selected_option_id: string }>) {
    const res = await apiClient.post(`/quizzes/${quizId}/attempt`, { answers });
    return res.data;
  },

  async getMyLearningProgress() {
    const res = await apiClient.get('/progress/my-learning');
    return res.data;
  },

  async getNotifications() {
    const res = await apiClient.get('/notifications');
    return res.data;
  },

  async markNotificationRead(id: string) {
    await apiClient.put(`/notifications/${id}/read`);
  },

  async registerPushToken(pushToken: string) {
    const res = await apiClient.post('/notifications/push-token', {
      push_token: pushToken,
      device_name: Platform.OS,
    });
    return res.data;
  },
};
