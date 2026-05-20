-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY profiles_select ON profiles FOR SELECT
    USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Children: parents can CRUD their own children
CREATE POLICY children_select ON children FOR SELECT
    USING (auth.uid() = parent_id);
CREATE POLICY children_insert ON children FOR INSERT
    WITH CHECK (auth.uid() = parent_id);
CREATE POLICY children_update ON children FOR UPDATE
    USING (auth.uid() = parent_id);
CREATE POLICY children_delete ON children FOR DELETE
    USING (auth.uid() = parent_id);

-- Courses: readable by any authenticated user
CREATE POLICY courses_select ON courses FOR SELECT
    USING (auth.role() = 'authenticated');

-- Lessons: readable by any authenticated user
CREATE POLICY lessons_select ON lessons FOR SELECT
    USING (auth.role() = 'authenticated');

-- Lesson Progress: parents can manage progress for their children
CREATE POLICY progress_select ON lesson_progress FOR SELECT
    USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY progress_insert ON lesson_progress FOR INSERT
    WITH CHECK (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY progress_update ON lesson_progress FOR UPDATE
    USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- Achievements: readable by any authenticated user
CREATE POLICY achievements_select ON achievements FOR SELECT
    USING (auth.role() = 'authenticated');

-- Child Achievements: parents can read their children's achievements
CREATE POLICY child_achievements_select ON child_achievements FOR SELECT
    USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- WhatsApp Sessions: service role only (no direct user access)
-- Edge Functions use service role key to bypass RLS

-- Institutions: readable by authenticated users
CREATE POLICY institutions_select ON institutions FOR SELECT
    USING (auth.role() = 'authenticated');

-- Languages: readable by anyone (including anonymous)
CREATE POLICY languages_select ON languages FOR SELECT
    USING (TRUE);
