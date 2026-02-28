-- Add age range columns to courses for age-based content filtering.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS min_age INT DEFAULT 3;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS max_age INT DEFAULT 16;

-- Update existing courses with appropriate age ranges

-- Basic English Greetings (easy, young kids)
UPDATE courses SET min_age = 3, max_age = 7
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Numbers and Counting (easy, young kids)
UPDATE courses SET min_age = 3, max_age = 7
WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- My First Computer (slightly older)
UPDATE courses SET min_age = 5, max_age = 10
WHERE id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

-- Colors and Shapes (young kids, medium difficulty)
UPDATE courses SET min_age = 4, max_age = 8
WHERE id = 'd4e5f6a7-b8c9-0123-defa-234567890123';
