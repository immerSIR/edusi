-- Add illustration descriptions to story steps so Gemini Imagen can generate visuals.
-- Also set course thumbnail descriptions for catalog cards.

-- "Hello and Goodbye" lesson
UPDATE lessons
SET content = '{
    "steps": [
        {
            "type": "story",
            "text": {
                "en": "When we meet someone, we say ''Hello!'' In Yoruba, we say ''Bawo ni!''",
                "yo": "Nigba ti a ba pade eniyan, a maa n so ''Hello!'' Ni ede Yoruba, a so ''Bawo ni!''"
            },
            "illustration": "Two Nigerian children waving at each other and smiling on a sunny school playground"
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
            },
            "illustration": "A Nigerian child waving goodbye to friends at the school gate with a backpack"
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
}'
WHERE course_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND order_index = 1;

-- "Please and Thank You" lesson
UPDATE lessons
SET content = '{
    "steps": [
        {
            "type": "story",
            "text": {
                "en": "When we want something, we say ''Please.'' In Yoruba, we say ''Jowo.''",
                "yo": "Nigba ti a ba fe nkan, a maa n so ''Please.'' Ni ede Yoruba, a so ''Jowo.''"
            },
            "illustration": "A Nigerian child politely asking a market vendor for a mango with hands together"
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
}'
WHERE course_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND order_index = 2;

-- "Numbers 1 to 5" lesson
UPDATE lessons
SET content = '{
    "steps": [
        {
            "type": "story",
            "text": {
                "en": "Let us learn to count! 1 is ONE (Okan), 2 is TWO (Eji), 3 is THREE (Eta).",
                "yo": "E je ki a ko kika! 1 ni ONE (Okan), 2 ni TWO (Eji), 3 ni THREE (Eta)."
            },
            "illustration": "Three Nigerian children holding up large colorful number cards 1, 2, 3 in a bright classroom"
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
            },
            "illustration": "Nigerian children counting on their fingers with numbers 4 and 5 floating above them"
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
}'
WHERE course_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND order_index = 1;

-- "What is a Computer?" lesson
UPDATE lessons
SET content = '{
    "steps": [
        {
            "type": "story",
            "text": {
                "en": "A computer is a machine that helps us work, learn, and play. It can do many things very fast!",
                "yo": "Komputu je ero ti o n ran wa lowo lati se ise, ko eko, ati se ere. O le se ohun pupo ni iyara!"
            },
            "illustration": "A Nigerian child sitting at a desk happily using a laptop computer in a colorful room"
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
                "yo": "Komputu ni iboju (bi TV), paadi tite (fun kiko), ati asin (fun titoka ati tiite)."
            },
            "illustration": "Close-up of a computer showing the screen, keyboard, and mouse with labels, with a curious Nigerian child pointing at each part"
        },
        {
            "type": "quiz",
            "question": {
                "en": "Which part of a computer do you use for typing?",
                "yo": "Apakan wo ni komputu ti o n lo fun tite?"
            },
            "options": [
                {"text": {"en": "Screen", "yo": "Iboju"}, "correct": false},
                {"text": {"en": "Mouse", "yo": "Asin"}, "correct": false},
                {"text": {"en": "Keyboard", "yo": "Paadi tite"}, "correct": true}
            ],
            "hint": {"en": "It has letters and numbers on it", "yo": "O ni leta ati nomba lori re"}
        }
    ]
}'
WHERE course_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
  AND order_index = 1;
