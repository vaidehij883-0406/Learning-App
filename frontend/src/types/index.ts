export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'learner' | 'educator' | 'admin';
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Batch {
  id: string;
  title: string;
  description?: string;
  educator_id: string;
  educator?: User;
  category: string;
  thumbnail_url?: string;
  start_date?: string;
  end_date?: string;
  language: string;
  is_published: boolean;
  enrollment_type: 'open' | 'approval' | 'private';
  lectures_count: number;
  enrolled_count: number;
  is_enrolled: boolean;
  created_at: string;
  updated_at: string;
}

export interface LectureResource {
  id: string;
  lecture_id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  is_downloadable: boolean;
  created_at: string;
}

export interface LectureProgress {
  last_position_seconds: number;
  completed: boolean;
  completed_at?: string;
}

export interface Lecture {
  id: string;
  batch_id: string;
  title: string;
  description?: string;
  subject?: string;
  duration_seconds: number;
  video_url: string;
  thumbnail_url?: string;
  sequence_order: number;
  is_published: boolean;
  is_public_preview: boolean;
  share_token: string;
  share_url?: string;
  resources: LectureResource[];
  user_progress?: LectureProgress;
  created_at: string;
  updated_at: string;
}

export interface LecturePublic {
  id: string;
  batch_id: string;
  batch_title: string;
  batch_category: string;
  educator?: User;
  title: string;
  description?: string;
  subject?: string;
  duration_seconds: number;
  video_url: string;
  thumbnail_url?: string;
  sequence_order: number;
  resources: LectureResource[];
  created_at: string;
}

export interface QuizOption {
  id: string;
  option_text: string;
  sequence_order: number;
  is_correct?: boolean; // Only present for educators
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  sequence_order: number;
  points: number;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  batch_id: string;
  lecture_id?: string;
  title: string;
  description?: string;
  time_limit_minutes: number;
  passing_score: number;
  max_attempts: number;
  is_published: boolean;
  questions_count: number;
  questions?: QuizQuestion[];
  user_attempts_count: number;
  best_score?: number;
  passed: boolean;
  created_at: string;
}

export interface QuestionResultDetail {
  question_id: string;
  prompt: string;
  selected_option_id?: string;
  correct_option_id: string;
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
}

export interface QuizAttemptResult {
  id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
  attempts_remaining: number;
  breakdown: QuestionResultDetail[];
}

export interface ChatMessage {
  id: string;
  batch_id: string;
  user_id: string;
  user?: User;
  message: string;
  is_announcement: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  batch_id: string;
  educator_id: string;
  educator?: User;
  title: string;
  content: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'lecture' | 'announcement' | 'quiz' | 'system' | 'info';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface LearningProgressSummary {
  enrolled_batches_count: number;
  total_completed_lectures: number;
  quizzes_attempted: number;
  quizzes_passed: number;
  batches: Array<{
    id: string;
    title: string;
    category: string;
    thumbnail_url?: string;
    educator_name: string;
    progress_percentage: number;
    total_lectures: number;
    completed_lectures: number;
    next_lecture?: {
      id: string;
      title: string;
      sequence_order: number;
      duration_seconds: number;
    };
  }>;
  recent_activities: Array<{
    lecture_id: string;
    lecture_title: string;
    batch_id: string;
    batch_title: string;
    completed: boolean;
    last_position_seconds: number;
    updated_at: string;
  }>;
}
