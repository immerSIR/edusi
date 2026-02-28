-- Migration 008: Replace age with date_of_birth, add learning profile fields, enforce 2-child limit

-- Add new columns
ALTER TABLE children ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE children ADD COLUMN IF NOT EXISTS school_grade TEXT;
ALTER TABLE children ADD COLUMN IF NOT EXISTS english_proficiency TEXT DEFAULT 'basic';
ALTER TABLE children ADD COLUMN IF NOT EXISTS tech_familiarity TEXT DEFAULT 'none';

-- Backfill date_of_birth from existing age (approximated to today minus age in years)
UPDATE children
SET date_of_birth = (CURRENT_DATE - (age * INTERVAL '1 year'))::DATE
WHERE date_of_birth IS NULL;

-- Make date_of_birth required
ALTER TABLE children ALTER COLUMN date_of_birth SET NOT NULL;

-- Drop old age column
ALTER TABLE children DROP COLUMN IF EXISTS age;

-- DOB range check: child must be between 3 and 16 years old at insert/update time
ALTER TABLE children ADD CONSTRAINT children_dob_range
CHECK (
  date_of_birth <= CURRENT_DATE - INTERVAL '3 years'
  AND date_of_birth >= CURRENT_DATE - INTERVAL '17 years'
);

-- 2-child-per-parent limit trigger
CREATE OR REPLACE FUNCTION enforce_max_children()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM children WHERE parent_id = NEW.parent_id) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 children per parent';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_max_children
  BEFORE INSERT ON children
  FOR EACH ROW EXECUTE FUNCTION enforce_max_children();
