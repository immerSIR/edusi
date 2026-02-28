-- Seed sample courses and lessons for testing

-- Sample courses
INSERT INTO courses (id, title, description, subject, difficulty_level, is_premium) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '{"en": "Basic English Greetings", "yo": "Ikini Geesi Ipile"}',
    '{"en": "Learn common English greetings and introductions", "yo": "Ko awon ikini Geesi ti o wopo ati ifihan ara eni"}',
    'english',
    1,
    FALSE
),
(
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    '{"en": "Numbers and Counting", "yo": "Awon Nomba ati Kika"}',
    '{"en": "Learn to count and use numbers in English", "yo": "Ko lati ka ati lo awon nomba ni ede Geesi"}',
    'english',
    1,
    FALSE
),
(
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    '{"en": "My First Computer", "yo": "Komputu Akoko Mi"}',
    '{"en": "Introduction to computers and technology", "yo": "Ifihan si awon komputu ati imowe-ero"}',
    'technology',
    1,
    FALSE
),
(
    'd4e5f6a7-b8c9-0123-defa-234567890123',
    '{"en": "Colors and Shapes", "yo": "Awon Awu ati Apejuwe"}',
    '{"en": "Learn colors and shapes in English", "yo": "Ko awon awu ati apejuwe ni ede Geesi"}',
    'english',
    2,
    TRUE
);

-- Lessons for "Basic English Greetings"
INSERT INTO lessons (course_id, order_index, title, content, lesson_type, points_reward, estimated_duration_mins) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    1,
    '{"en": "Hello and Goodbye", "yo": "Bawo ni ati O dabo"}',
    '{
        "steps": [
            {
                "type": "story",
                "text": {
                    "en": "When we meet someone, we say ''Hello!'' In Yoruba, we say ''Bawo ni!''",
                    "yo": "Nigba ti a ba pade eniyan, a maa n so ''Hello!'' Ni ede Yoruba, a so ''Bawo ni!''"
                }
            },
            {
                "type": "quiz",
                "question": {
                    "en": "What do you say when you meet someone?",
                    "yo": "Kini o so nigba ti o ba pade eniyan?"
                },
                "options": [
                    {"text": {"en": "Goodbye", "yo": "O dabo"}, "correct": false},
                    {"text": {"en": "Hello", "yo": "Bawo ni"}, "correct": true},
                    {"text": {"en": "Thank you", "yo": "E se"}, "correct": false}
                ],
                "hint": {"en": "It is the first thing you say!", "yo": "O je ohun akoko ti o so!"}
            },
            {
                "type": "voice",
                "prompt": {"en": "Say: Hello, my name is...", "yo": "So: Bawo ni, oruko mi ni..."},
                "expected_text": "hello my name is",
                "language": "en"
            },
            {
                "type": "story",
                "text": {
                    "en": "When we leave, we say ''Goodbye!'' In Yoruba, we say ''O dabo!''",
                    "yo": "Nigba ti a ba n lo, a maa n so ''Goodbye!'' Ni ede Yoruba, a so ''O dabo!''"
                }
            },
            {
                "type": "quiz",
                "question": {
                    "en": "Match the greeting: What is ''Goodbye'' in Yoruba?",
                    "yo": "Mu ikini dogo po: Kini ''Goodbye'' ni ede Yoruba?"
                },
                "options": [
                    {"text": {"en": "Bawo ni", "yo": "Bawo ni"}, "correct": false},
                    {"text": {"en": "E se", "yo": "E se"}, "correct": false},
                    {"text": {"en": "O dabo", "yo": "O dabo"}, "correct": true}
                ],
                "hint": {"en": "We say this when leaving", "yo": "A so eyi nigba ti a n lo"}
            }
        ]
    }',
    'interactive',
    15,
    5
),
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    2,
    '{"en": "Please and Thank You", "yo": "Jowo ati E se"}',
    '{
        "steps": [
            {
                "type": "story",
                "text": {
                    "en": "When we want something, we say ''Please.'' In Yoruba, we say ''Jowo.''",
                    "yo": "Nigba ti a ba fe nkan, a maa n so ''Please.'' Ni ede Yoruba, a so ''Jowo.''"
                }
            },
            {
                "type": "quiz",
                "question": {
                    "en": "What is the polite word to use when asking for something?",
                    "yo": "Kini oro onitoju lati lo nigba ti o ba n beere fun nkan?"
                },
                "options": [
                    {"text": {"en": "Now!", "yo": "Bayi!"}, "correct": false},
                    {"text": {"en": "Please", "yo": "Jowo"}, "correct": true},
                    {"text": {"en": "Give me", "yo": "Fun mi"}, "correct": false}
                ],
                "hint": {"en": "This is a magic word!", "yo": "Eyi je oro idan!"}
            },
            {
                "type": "voice",
                "prompt": {"en": "Say: Thank you very much", "yo": "So: E se pupo"},
                "expected_text": "thank you very much",
                "language": "en"
            },
            {
                "type": "quiz",
                "question": {
                    "en": "What do you say after someone helps you?",
                    "yo": "Kini o so leyin ti eniyan ba ran o lowo?"
                },
                "options": [
                    {"text": {"en": "Thank you", "yo": "E se"}, "correct": true},
                    {"text": {"en": "Hello", "yo": "Bawo ni"}, "correct": false},
                    {"text": {"en": "Please", "yo": "Jowo"}, "correct": false}
                ],
                "hint": {"en": "You show gratitude", "yo": "O fi oore-ofe han"}
            }
        ]
    }',
    'interactive',
    15,
    5
);

-- Lessons for "Numbers and Counting"
INSERT INTO lessons (course_id, order_index, title, content, lesson_type, points_reward, estimated_duration_mins) VALUES
(
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    1,
    '{"en": "Numbers 1 to 5", "yo": "Awon Nomba 1 si 5"}',
    '{
        "steps": [
            {
                "type": "story",
                "text": {
                    "en": "Let us learn to count! 1 is ONE (Okan), 2 is TWO (Eji), 3 is THREE (Eta).",
                    "yo": "E je ki a ko kika! 1 ni ONE (Okan), 2 ni TWO (Eji), 3 ni THREE (Eta)."
                }
            },
            {
                "type": "quiz",
                "question": {
                    "en": "What number is TWO in Yoruba?",
                    "yo": "Nomba wo ni TWO ni ede Yoruba?"
                },
                "options": [
                    {"text": {"en": "Okan", "yo": "Okan"}, "correct": false},
                    {"text": {"en": "Eji", "yo": "Eji"}, "correct": true},
                    {"text": {"en": "Eta", "yo": "Eta"}, "correct": false}
                ],
                "hint": {"en": "It comes after one", "yo": "O wa leyin okan"}
            },
            {
                "type": "story",
                "text": {
                    "en": "4 is FOUR (Erin) and 5 is FIVE (Arun). Now you can count to five!",
                    "yo": "4 ni FOUR (Erin) ati 5 ni FIVE (Arun). Bayi o le ka si marun!"
                }
            },
            {
                "type": "voice",
                "prompt": {"en": "Count from 1 to 5: one, two, three, four, five", "yo": "Ka lati 1 si 5: okan, eji, eta, erin, arun"},
                "expected_text": "one two three four five",
                "language": "en"
            },
            {
                "type": "quiz",
                "question": {
                    "en": "How many fingers on one hand?",
                    "yo": "Ika melo ni o wa lori owo kan?"
                },
                "options": [
                    {"text": {"en": "Three (Eta)", "yo": "Eta"}, "correct": false},
                    {"text": {"en": "Four (Erin)", "yo": "Erin"}, "correct": false},
                    {"text": {"en": "Five (Arun)", "yo": "Arun"}, "correct": true}
                ],
                "hint": {"en": "Count all your fingers on one hand", "yo": "Ka gbogbo ika re lori owo kan"}
            }
        ]
    }',
    'interactive',
    15,
    5
);

-- Lessons for "My First Computer"
INSERT INTO lessons (course_id, order_index, title, content, lesson_type, points_reward, estimated_duration_mins) VALUES
(
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    1,
    '{"en": "What is a Computer?", "yo": "Kini Komputu?"}',
    '{
        "steps": [
            {
                "type": "story",
                "text": {
                    "en": "A computer is a machine that helps us work, learn, and play. It can do many things very fast!",
                    "yo": "Komputu je ero ti o n ran wa lowo lati se ise, ko eko, ati se ere. O le se ohun pupọ ni iyara!"
                }
            },
            {
                "type": "quiz",
                "question": {
                    "en": "What can a computer help you do?",
                    "yo": "Kini komputu le ran o lowo lati se?"
                },
                "options": [
                    {"text": {"en": "Only play games", "yo": "Se ere nikan"}, "correct": false},
                    {"text": {"en": "Work, learn, and play", "yo": "Ise, eko, ati ere"}, "correct": true},
                    {"text": {"en": "Nothing", "yo": "Ohunkohun"}, "correct": false}
                ],
                "hint": {"en": "Computers can do many things!", "yo": "Komputu le se ohun pupo!"}
            },
            {
                "type": "story",
                "text": {
                    "en": "A computer has a screen (like a TV), a keyboard (for typing), and a mouse (for pointing and clicking).",
                    "yo": "Komputu ni iboju (bi TV), paadi titẹ (fun kikọ), ati asin (fun titọka ati tiitẹ)."
                }
            },
            {
                "type": "quiz",
                "question": {
                    "en": "Which part of a computer do you use for typing?",
                    "yo": "Apakan wo ni komputu ti o n lo fun titẹ?"
                },
                "options": [
                    {"text": {"en": "Screen", "yo": "Iboju"}, "correct": false},
                    {"text": {"en": "Mouse", "yo": "Asin"}, "correct": false},
                    {"text": {"en": "Keyboard", "yo": "Paadi titẹ"}, "correct": true}
                ],
                "hint": {"en": "It has letters and numbers on it", "yo": "O ni leta ati nomba lori re"}
            }
        ]
    }',
    'interactive',
    15,
    5
);

-- Sample achievements
INSERT INTO achievements (name, description, icon_url, criteria) VALUES
(
    '{"en": "First Steps", "yo": "Igbesẹ Akọkọ"}',
    '{"en": "Complete your first lesson", "yo": "Pari ẹkọ akọkọ rẹ"}',
    '',
    '{"type": "lessons_completed", "count": 1}'
),
(
    '{"en": "Quick Learner", "yo": "Oluko Iyara"}',
    '{"en": "Complete 5 lessons", "yo": "Pari ẹkọ marun"}',
    '',
    '{"type": "lessons_completed", "count": 5}'
),
(
    '{"en": "Star Student", "yo": "Akẹkọ Irawo"}',
    '{"en": "Earn 100 points", "yo": "Gba ami ọgọrun"}',
    '',
    '{"type": "points_earned", "count": 100}'
),
(
    '{"en": "Perfect Score", "yo": "Ami Pipe"}',
    '{"en": "Get 100% on a lesson", "yo": "Gba 100% lori ẹkọ kan"}',
    '',
    '{"type": "perfect_lesson", "count": 1}'
);
