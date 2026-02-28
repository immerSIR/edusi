-- Edusi Initial Schema
-- Gamified bilingual learning platform for Nigerian children

-- Custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'institutional');
CREATE TYPE course_subject AS ENUM ('english', 'technology');
CREATE TYPE lesson_type AS ENUM ('interactive', 'quiz', 'story', 'practice');
CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE institution_type AS ENUM ('ngo', 'government', 'school');

-- Institutions (must be created before profiles due to FK)
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type institution_type NOT NULL,
    max_seats INT NOT NULL DEFAULT 100,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    phone TEXT,
    whatsapp_number TEXT UNIQUE,
    whatsapp_verified BOOLEAN NOT NULL DEFAULT FALSE,
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    preferred_language TEXT NOT NULL DEFAULT 'yo',
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Children (owned by parent profile, NOT auth users)
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INT NOT NULL CHECK (age >= 3 AND age <= 16),
    avatar_url TEXT,
    current_level INT NOT NULL DEFAULT 1,
    total_points INT NOT NULL DEFAULT 0,
    preferred_language TEXT NOT NULL DEFAULT 'yo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_children_parent_id ON children(parent_id);

-- Languages (registry for future-proofing)
CREATE TABLE languages (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    native_name TEXT NOT NULL,
    asr_model_id TEXT,
    tts_model_id TEXT,
    active BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed initial languages
INSERT INTO languages (code, name, native_name, asr_model_id, tts_model_id, active) VALUES
    ('yo', 'Yoruba', 'Èdè Yorùbá', 'LyngualLabs/whisper-small-yoruba', 'facebook/mms-tts-yor', TRUE),
    ('en', 'English', 'English', 'openai/whisper', 'openai/tts', TRUE),
    ('ig', 'Igbo', 'Asụsụ Igbo', NULL, NULL, FALSE),
    ('ha', 'Hausa', 'Harshen Hausa', NULL, NULL, FALSE);

-- Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title JSONB NOT NULL DEFAULT '{"en": "", "yo": ""}',
    description JSONB NOT NULL DEFAULT '{"en": "", "yo": ""}',
    subject course_subject NOT NULL,
    difficulty_level INT NOT NULL DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    thumbnail_url TEXT NOT NULL DEFAULT '',
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    title JSONB NOT NULL DEFAULT '{"en": "", "yo": ""}',
    content JSONB NOT NULL DEFAULT '{"steps": []}',
    lesson_type lesson_type NOT NULL DEFAULT 'interactive',
    points_reward INT NOT NULL DEFAULT 10,
    estimated_duration_mins INT NOT NULL DEFAULT 5,
    illustrations JSONB NOT NULL DEFAULT '[]',
    audio_urls JSONB NOT NULL DEFAULT '{"en": "", "yo": ""}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, order_index)
);

CREATE INDEX idx_lessons_course_id ON lessons(course_id);

-- Lesson Progress
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status progress_status NOT NULL DEFAULT 'not_started',
    score INT,
    points_earned INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    responses JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE (child_id, lesson_id)
);

CREATE INDEX idx_progress_child_id ON lesson_progress(child_id);
CREATE INDEX idx_progress_lesson_id ON lesson_progress(lesson_id);

-- Achievements
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name JSONB NOT NULL DEFAULT '{"en": "", "yo": ""}',
    description JSONB NOT NULL DEFAULT '{"en": "", "yo": ""}',
    icon_url TEXT NOT NULL DEFAULT '',
    criteria JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Child Achievements (junction table)
CREATE TABLE child_achievements (
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (child_id, achievement_id)
);

-- WhatsApp Sessions
CREATE TABLE whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_number TEXT NOT NULL,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    current_lesson_id UUID REFERENCES lessons(id),
    session_state JSONB NOT NULL DEFAULT '{}',
    last_activity TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_sessions_number ON whatsapp_sessions(whatsapp_number);

-- Function to increment child points
CREATE OR REPLACE FUNCTION increment_child_points(child_id_param UUID, points_param INT)
RETURNS VOID AS $$
BEGIN
    UPDATE children
    SET total_points = total_points + points_param
    WHERE id = child_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        NEW.phone
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
