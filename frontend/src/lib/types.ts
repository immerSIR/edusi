export interface BilingualText {
  en: string;
  yo: string;
}

export interface Profile {
  id: string;
  display_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  subscription_tier: "free" | "premium" | "institutional";
  preferred_language: string;
  institution_id: string | null;
  created_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  age: number;
  avatar_url: string | null;
  current_level: number;
  total_points: number;
  preferred_language: string;
  created_at: string;
}

export interface Course {
  id: string;
  title: BilingualText;
  description: BilingualText;
  subject: "english" | "technology";
  difficulty_level: number;
  thumbnail_url: string;
  is_premium: boolean;
  created_at: string;
}

export interface LessonStep {
  type: "story" | "quiz" | "voice" | "matching" | "practice";
  text?: BilingualText;
  illustration?: string;
  audio?: { en: string; yo: string };
  question?: BilingualText;
  options?: { text: BilingualText; correct: boolean }[];
  hint?: BilingualText;
  prompt?: BilingualText;
  expected_text?: string;
  language?: string;
  pairs?: { left: BilingualText; right: BilingualText }[];
}

export interface Lesson {
  id: string;
  course_id: string;
  order_index: number;
  title: BilingualText;
  content: { steps: LessonStep[] };
  lesson_type: "interactive" | "quiz" | "story" | "practice";
  points_reward: number;
  estimated_duration_mins: number;
  illustrations: string[];
  audio_urls: { en: string; yo: string };
  created_at: string;
}

export interface LessonProgress {
  id: string;
  child_id: string;
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  points_earned: number;
  attempts: number;
  responses: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
}

export interface Achievement {
  id: string;
  name: BilingualText;
  description: BilingualText;
  icon_url: string;
  criteria: { type: string; count: number };
}
