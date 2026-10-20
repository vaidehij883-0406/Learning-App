-- ============================================================================
-- LearnBatch: Database Schema and Row Level Security Policies
-- Compatible with PostgreSQL 15+ and Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Profiles (Linked to auth.users or standalone auth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'educator', 'admin')),
    avatar_url TEXT,
    bio TEXT,
    hashed_password TEXT, -- For standalone/direct auth fallback
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ----------------------------------------------------------------------------
-- 2. Batches
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    educator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'General',
    thumbnail_url TEXT,
    start_date DATE,
    end_date DATE,
    language TEXT NOT NULL DEFAULT 'English',
    is_published BOOLEAN NOT NULL DEFAULT false,
    enrollment_type TEXT NOT NULL DEFAULT 'open' CHECK (enrollment_type IN ('open', 'approval', 'private')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batches_educator ON batches(educator_id);
CREATE INDEX IF NOT EXISTS idx_batches_published ON batches(is_published);
CREATE INDEX IF NOT EXISTS idx_batches_category ON batches(category);

-- ----------------------------------------------------------------------------
-- 3. Batch Memberships / Enrollments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batch_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_in_batch TEXT NOT NULL DEFAULT 'student' CHECK (role_in_batch IN ('student', 'assistant', 'educator')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_batch_user UNIQUE (batch_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON batch_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_batch ON batch_memberships(batch_id);

-- ----------------------------------------------------------------------------
-- 4. Lectures
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_public_preview BOOLEAN NOT NULL DEFAULT true,
    share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lectures_batch ON lectures(batch_id);
CREATE INDEX IF NOT EXISTS idx_lectures_share_token ON lectures(share_token);
CREATE INDEX IF NOT EXISTS idx_lectures_sequence ON lectures(batch_id, sequence_order);

-- ----------------------------------------------------------------------------
-- 5. Lecture Resources (PDF Notes, Guides)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lecture_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'pdf',
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    is_downloadable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_lecture ON lecture_resources(lecture_id);

-- ----------------------------------------------------------------------------
-- 6. Lecture Progress
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lecture_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    last_position_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_lecture UNIQUE (user_id, lecture_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON lecture_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lecture ON lecture_progress(lecture_id);

-- ----------------------------------------------------------------------------
-- 7. Quizzes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER DEFAULT 15,
    passing_score INTEGER NOT NULL DEFAULT 60,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_batch ON quizzes(batch_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lecture ON quizzes(lecture_id);

-- ----------------------------------------------------------------------------
-- 8. Quiz Questions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    points INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz ON quiz_questions(quiz_id);

-- ----------------------------------------------------------------------------
-- 9. Quiz Options (Answer Keys kept secure!)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    sequence_order INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_options_question ON quiz_options(question_id);

-- ----------------------------------------------------------------------------
-- 10. Quiz Attempts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 0,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    passed BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attempts_quiz_user ON quiz_attempts(quiz_id, user_id);

-- ----------------------------------------------------------------------------
-- 11. Quiz Answers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES quiz_options(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_answers_attempt ON quiz_answers(attempt_id);

-- ----------------------------------------------------------------------------
-- 12. Chat Messages
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_announcement BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_batch ON chat_messages(batch_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 13. Announcements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    educator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_batch ON announcements(batch_id);

-- ----------------------------------------------------------------------------
-- 14. Notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('lecture', 'announcement', 'quiz', 'system', 'info')),
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- 15. Reports / Moderation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('message', 'lecture', 'batch', 'user')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Public can read, user can update self
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Batches: Everyone can view published batches; educators manage theirs
CREATE POLICY "Published batches are viewable by everyone" 
  ON batches FOR SELECT USING (is_published = true OR educator_id = auth.uid() OR is_admin());

CREATE POLICY "Educators can create batches" 
  ON batches FOR INSERT WITH CHECK (auth.uid() = educator_id);

CREATE POLICY "Educators can update their own batches" 
  ON batches FOR UPDATE USING (educator_id = auth.uid() OR is_admin());

CREATE POLICY "Educators can delete their own batches" 
  ON batches FOR DELETE USING (educator_id = auth.uid() OR is_admin());

-- Batch Memberships:
CREATE POLICY "Users can view their memberships" 
  ON batch_memberships FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can enroll themselves" 
  ON batch_memberships FOR INSERT WITH CHECK (user_id = auth.uid());

-- Lectures:
CREATE POLICY "Public preview or enrolled users can view published lectures" 
  ON lectures FOR SELECT USING (
    (is_published = true AND (is_public_preview = true OR EXISTS (
      SELECT 1 FROM batch_memberships WHERE batch_id = lectures.batch_id AND user_id = auth.uid() AND is_active = true
    ))) 
    OR EXISTS (
      SELECT 1 FROM batches WHERE batches.id = lectures.batch_id AND batches.educator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Batch educators can manage lectures" 
  ON lectures FOR ALL USING (
    EXISTS (SELECT 1 FROM batches WHERE batches.id = lectures.batch_id AND batches.educator_id = auth.uid()) OR is_admin()
  );

-- Progress:
CREATE POLICY "Users view own progress" 
  ON lecture_progress FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users manage own progress" 
  ON lecture_progress FOR ALL USING (user_id = auth.uid());

-- Quizzes:
CREATE POLICY "Enrolled students can view published quizzes" 
  ON quizzes FOR SELECT USING (
    (is_published = true AND EXISTS (
      SELECT 1 FROM batch_memberships WHERE batch_id = quizzes.batch_id AND user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM batches WHERE batches.id = quizzes.batch_id AND batches.educator_id = auth.uid()
    )
    OR is_admin()
  );

-- Notifications:
CREATE POLICY "Users view own notifications" 
  ON notifications FOR ALL USING (user_id = auth.uid());

-- Chat:
CREATE POLICY "Batch members can view messages" 
  ON chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM batch_memberships WHERE batch_id = chat_messages.batch_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM batches WHERE id = chat_messages.batch_id AND educator_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Batch members can post messages" 
  ON chat_messages FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM batch_memberships WHERE batch_id = chat_messages.batch_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM batches WHERE id = chat_messages.batch_id AND educator_id = auth.uid())
    )
  );
