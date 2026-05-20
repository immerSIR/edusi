-- Technology curriculum: 9 topics x 3 age tiers = 27 courses.
-- 3 "Everyday Devices" courses are fully seeded with lessons.
-- The remaining 24 are course shells (lessons generated on demand via AI).
-- NOTE: This migration was applied to production via MCP in parts.
-- The local file uses gen_random_uuid() to avoid hardcoding UUIDs.

-- ============================================================
-- ALL 27 TECHNOLOGY COURSES
-- ============================================================
INSERT INTO courses (title, description, subject, difficulty_level, is_premium, min_age, max_age) VALUES
-- Everyday Devices (3 tiers)
('{"en": "Everyday Devices", "yo": "Awon Ero Ojoojumo"}', '{"en": "Learn about phones, TVs, and tablets — the helpers around us!", "yo": "Ko nipa foonu, TV, ati taabuleti — awon oluranlowo yi wa ka!"}', 'technology', 1, false, 3, 6),
('{"en": "How Devices Work", "yo": "Bi Awon Ero Se N Sise"}', '{"en": "Discover how screens glow, speakers make sound, and batteries store energy.", "yo": "Se awari bi iboju se n tan, bi agbohunsoke se n jade ohun, ati bi batiri se n fi agbara pamo."}', 'technology', 2, false, 7, 10),
('{"en": "Inside Your Devices", "yo": "Inu Awon Ero Re"}', '{"en": "Understand processors, RAM, storage, and how hardware components work together.", "yo": "Ye ohun ti proseso, RAM, ibi ipamo, ati bi awon apakan ero se n ba ara won sise."}', 'technology', 3, false, 11, 16),
-- GSM & Phone Calls (3 tiers)
('{"en": "How Phone Calls Work", "yo": "Bi Ipe Foonu Se N Sise"}', '{"en": "Learn how your voice travels through the air to reach someone far away!", "yo": "Ko bi ohun re se n rin nipase afefe lati de eniyan ti o wa ni ijinna!"}', 'technology', 1, false, 3, 6),
('{"en": "GSM and Cell Towers", "yo": "GSM ati Ile-Iso Foonu"}', '{"en": "Discover how cell towers pass your voice from tower to tower across the country.", "yo": "Se awari bi ile-iso foonu se n gbe ohun re lati ile-iso kan si ekeji ni gbogbo orilede."}', 'technology', 2, false, 7, 10),
('{"en": "Mobile Networks Explained", "yo": "Alaye Nipa Netiwuoki Alagbeka"}', '{"en": "Understand GSM, 3G, 4G, and 5G — how mobile data networks encode and transmit signals.", "yo": "Ye GSM, 3G, 4G, ati 5G — bi netiwuoki data alagbeka se n ko ati fi ami ranse."}', 'technology', 3, false, 11, 16),
-- Television & TV Signals (3 tiers)
('{"en": "How TV Shows Reach You", "yo": "Bi Eto TV Se N De O"}', '{"en": "Learn how the pictures and sounds on TV travel to your home!", "yo": "Ko bi aworan ati ohun lori TV se n rin lo si ile re!"}', 'technology', 1, false, 3, 6),
('{"en": "TV Signals and Satellites", "yo": "Ami TV ati Satelaiti"}', '{"en": "Discover how satellites in space beam TV programs to your dish or antenna.", "yo": "Se awari bi satelaiti ni sanma se n tan eto TV si ero tabi eriali re."}', 'technology', 2, false, 7, 10),
('{"en": "Digital Broadcasting", "yo": "Igbohunsafefe Dijitali"}', '{"en": "Understand analog vs digital TV, compression, and streaming technology.", "yo": "Ye iyato laarin TV analogi ati dijitali, funmoraporo, ati ero itusile fidio."}', 'technology', 3, false, 11, 16),
-- Radio & Radio Waves (3 tiers)
('{"en": "Listening to the Radio", "yo": "Gbigbo Redio"}', '{"en": "Learn how music and voices come out of the radio!", "yo": "Ko bi orin ati ohun eniyan se n jade ninu redio!"}', 'technology', 1, false, 3, 6),
('{"en": "Radio Waves Are Everywhere", "yo": "Igbi Redio Wa Ni Gbogbo Ibi"}', '{"en": "Discover invisible waves that carry sound through the air.", "yo": "Se awari awon igbi ti a ko le ri ti o n gbe ohun kiri nipase afefe."}', 'technology', 2, false, 7, 10),
('{"en": "Electromagnetic Spectrum", "yo": "Iwon Itanna-Oofa"}', '{"en": "Understand AM vs FM, frequency, wavelength, and the electromagnetic spectrum.", "yo": "Ye AM ati FM, igbohunsafefe, gigun igbi, ati iwon itanna-oofa."}', 'technology', 3, false, 11, 16),
-- Bluetooth (3 tiers)
('{"en": "Sharing Without Wires", "yo": "Pinpin Laisi Okun"}', '{"en": "Learn how Bluetooth lets devices talk to each other without any wires!", "yo": "Ko bi Bluetooth se je ki awon ero ba ara won soro laisi okun kankan!"}', 'technology', 1, false, 3, 6),
('{"en": "How Bluetooth Connects", "yo": "Bi Bluetooth Se N Sopo"}', '{"en": "Discover pairing, range limits, and why Bluetooth uses so little battery.", "yo": "Se awari bii so po, opin jinna, ati idi ti Bluetooth fi n lo batiri die."}', 'technology', 2, false, 7, 10),
('{"en": "Bluetooth Technology Deep Dive", "yo": "Iwadii Jinle Ero Bluetooth"}', '{"en": "Understand Bluetooth protocols, frequency hopping, and BLE (Bluetooth Low Energy).", "yo": "Ye awon ilana Bluetooth, fo igbohunsafefe, ati BLE (Bluetooth Agbara Kekere)."}', 'technology', 3, false, 11, 16),
-- WiFi & The Internet (3 tiers)
('{"en": "What Is WiFi?", "yo": "Kini WiFi?"}', '{"en": "Learn how WiFi connects you to games, videos, and friends — like invisible magic!", "yo": "Ko bi WiFi se so o po mo ere, fidio, ati ore — bi idan ti a ko le ri!"}', 'technology', 1, false, 3, 6),
('{"en": "WiFi and the Internet", "yo": "WiFi ati Intaneti"}', '{"en": "Discover routers, the internet, and how web pages travel to your screen.", "yo": "Se awari rauta, intaneti, ati bi oju-iwe ayelujara se n rin lo si iboju re."}', 'technology', 2, false, 7, 10),
('{"en": "Networking Fundamentals", "yo": "Ipile Netiwuoki"}', '{"en": "Understand IP addresses, DNS, HTTP, and how data packets travel across networks.", "yo": "Ye adiresi IP, DNS, HTTP, ati bi awon apo data se n rin kiri lori netiwuoki."}', 'technology', 3, false, 11, 16),
-- Artificial Intelligence (3 tiers)
('{"en": "Smart Helpers", "yo": "Awon Oluranlowo Ologbon"}', '{"en": "Learn how computers can be smart helpers — they can see pictures and understand your voice!", "yo": "Ko bi awon komputa se le je oluranlowo ologbon — won le ri aworan ti won si le ye ohun re!"}', 'technology', 1, false, 3, 6),
('{"en": "What Is Artificial Intelligence?", "yo": "Kini Ogbon Atowodowo?"}', '{"en": "Discover how computers learn from examples, recognize faces, and play games.", "yo": "Se awari bi awon komputa se n ko lati inu apeere, da oju mo, ati se ere."}', 'technology', 2, false, 7, 10),
('{"en": "AI and Machine Learning", "yo": "AI ati Eko Ero"}', '{"en": "Understand neural networks, training data, classification, and AI ethics.", "yo": "Ye netiwuoki isan-ara, data ikeko, isori, ati iwa AI."}', 'technology', 3, false, 11, 16),
-- Large Language Models (3 tiers)
('{"en": "Talking Computers", "yo": "Awon Komputa Ti N Soro"}', '{"en": "Learn about computers that can write stories and answer your questions!", "yo": "Ko nipa awon komputa ti o le ko itan ti o si le dahun ibeere re!"}', 'technology', 1, false, 3, 6),
('{"en": "How Chatbots Work", "yo": "Bi Chatbot Se N Sise"}', '{"en": "Discover how AI reads your messages and writes back using patterns from millions of books.", "yo": "Se awari bi AI se n ka ifiranṣe re ti o si n ko esi pada nipa lilo awon apeere lati inu milionu iwe."}', 'technology', 2, false, 7, 10),
('{"en": "Large Language Models", "yo": "Awon Awose Ede Nla"}', '{"en": "Understand transformers, tokens, training, fine-tuning, and responsible AI use.", "yo": "Ye awon transformer, token, ikeko, itunse, ati lilo AI lododo."}', 'technology', 3, false, 11, 16),
-- Robots & Automation (3 tiers)
('{"en": "Robots Are Our Friends", "yo": "Awon Roboti Ni Ore Wa"}', '{"en": "Learn about robots that help us clean, build, and explore!", "yo": "Ko nipa awon roboti ti o n ran wa lowo lati nu, ko, ati se iwadii!"}', 'technology', 1, false, 3, 6),
('{"en": "How Robots Move and Think", "yo": "Bi Awon Roboti Se N Rin Ati Ronu"}', '{"en": "Discover sensors, motors, and how robots follow instructions.", "yo": "Se awari awon senso, moto, ati bi awon roboti se n tele ilana."}', 'technology', 2, false, 7, 10),
('{"en": "Robotics and Automation", "yo": "Robotiki ati Isise Adase"}', '{"en": "Understand actuators, control systems, programming robots, and industrial automation.", "yo": "Ye awon actuator, eto isakoso, eto roboti, ati isise adase ile-ise."}', 'technology', 3, false, 11, 16);

-- ============================================================
-- FULLY SEEDED LESSONS (for the 3 "Everyday Devices" courses)
-- ============================================================

-- Lesson for "Everyday Devices" (Ages 3-6)
INSERT INTO lessons (course_id, order_index, title, content, lesson_type, points_reward, estimated_duration_mins)
SELECT id, 1,
  '{"en": "What Are These Things?", "yo": "Kini Awon Nkan Wonyi?"}',
  '{
    "steps": [
      {"type": "story", "text": {"en": "Look around you! Do you see a phone? A phone helps us talk to people far away.", "yo": "Wo ni ayika re! Se o ri foonu? Foonu ran wa lowo lati ba eniyan ti o wa ni ijo soro."}, "illustration": "A happy Nigerian child holding a phone and talking to grandma on the screen in a bright living room"},
      {"type": "quiz", "question": {"en": "What does a phone help us do?", "yo": "Kini foonu ran wa lowo lati se?"}, "options": [{"text": {"en": "Talk to people", "yo": "Ba eniyan soro"}, "correct": true}, {"text": {"en": "Cook food", "yo": "Se ounje"}, "correct": false}, {"text": {"en": "Fly in the sky", "yo": "Fo lo si sanma"}, "correct": false}], "hint": {"en": "You hold it near your ear!", "yo": "O mu u si eti re!"}},
      {"type": "story", "text": {"en": "A television (TV) shows us pictures and sounds. We can watch cartoons and learn new things!", "yo": "Telifisan (TV) fi aworan ati ohun han wa. A le wo katuni ati ko ohun titun!"}, "illustration": "Nigerian children sitting together watching a cartoon on a TV in a colorful living room"},
      {"type": "quiz", "question": {"en": "What can we watch on a TV?", "yo": "Kini a le wo lori TV?"}, "options": [{"text": {"en": "Cartoons", "yo": "Katuni"}, "correct": true}, {"text": {"en": "The rain", "yo": "Ojo"}, "correct": false}, {"text": {"en": "Our hands", "yo": "Owo wa"}, "correct": false}], "hint": {"en": "Fun moving pictures!", "yo": "Aworan atigbadegba ti o dun!"}},
      {"type": "voice", "prompt": {"en": "Say: I can see a phone and a TV", "yo": "So: Mo le ri foonu ati TV"}, "expected_text": "i can see a phone and a tv", "language": "en"}
    ]
  }',
  'interactive', 10, 5
FROM courses WHERE title->>'en' = 'Everyday Devices' AND min_age = 3;

-- Lesson for "How Devices Work" (Ages 7-10)
INSERT INTO lessons (course_id, order_index, title, content, lesson_type, points_reward, estimated_duration_mins)
SELECT id, 1,
  '{"en": "Screens, Speakers and Batteries", "yo": "Iboju, Agbohunsoke ati Batiri"}',
  '{
    "steps": [
      {"type": "story", "text": {"en": "Every phone and tablet has a screen. The screen is made of tiny dots called pixels. Thousands of pixels light up to create the pictures you see!", "yo": "Gbogbo foonu ati taabuleti ni iboju. Iboju ni awon aami kekere ti a pe ni pikseli. Egbegberun pikseli maa n tan lati da aworan ti o ri!"}, "illustration": "Close-up of a phone screen showing colorful pixels with a curious Nigerian child looking at it through a magnifying glass"},
      {"type": "quiz", "question": {"en": "What are the tiny dots on a screen called?", "yo": "Kini awon aami kekere lori iboju n pe ni?"}, "options": [{"text": {"en": "Stars", "yo": "Irawu"}, "correct": false}, {"text": {"en": "Pixels", "yo": "Pikseli"}, "correct": true}, {"text": {"en": "Seeds", "yo": "Irugbin"}, "correct": false}], "hint": {"en": "It starts with the letter P", "yo": "O bere pelu leta P"}},
      {"type": "story", "text": {"en": "Speakers turn electricity into sound waves. When music plays on your phone, a thin material inside the speaker vibrates very fast and pushes the air — that is what you hear!", "yo": "Agbohunsoke yi ina mole pada si igbi ohun. Nigba ti orin ba n gun lori foonu re, nkan tinrin ninu agbohunsoke maa n mi ni iyara gidigidi ti o si n ti afefe — iyyen ni o n gbo!"}, "illustration": "A diagram showing sound waves coming from a phone speaker with a Nigerian child dancing nearby"},
      {"type": "quiz", "question": {"en": "How does a speaker make sound?", "yo": "Bawo ni agbohunsoke se n da ohun jade?"}, "options": [{"text": {"en": "By shaking (vibrating) very fast", "yo": "Nipa gbigbon ni iyara"}, "correct": true}, {"text": {"en": "By getting hot", "yo": "Nipa gbigbona"}, "correct": false}, {"text": {"en": "By growing bigger", "yo": "Nipa didagba"}, "correct": false}], "hint": {"en": "Think about something moving quickly back and forth", "yo": "Ro nipa nkan ti o n lo siwaju ati seyin ni kiakia"}},
      {"type": "story", "text": {"en": "A battery is like a tiny energy tank. It stores electricity so your phone works even without a wire plugged in. When the battery is empty, you need to charge it!", "yo": "Batiri dabi tanki agbara kekere. O n fi ina mole pamo ki foonu re le sise lai fi okun wole. Nigba ti batiri ba pari, o nilo lati gba agbara!"}, "illustration": "A Nigerian child plugging a phone charger into a wall socket with a battery icon showing it filling up"},
      {"type": "voice", "prompt": {"en": "Say: Screens use pixels and batteries store energy", "yo": "So: Iboju lo pikseli ati batiri fi agbara pamo"}, "expected_text": "screens use pixels and batteries store energy", "language": "en"}
    ]
  }',
  'interactive', 10, 5
FROM courses WHERE title->>'en' = 'How Devices Work' AND min_age = 7;

-- Lesson for "Inside Your Devices" (Ages 11-16)
INSERT INTO lessons (course_id, order_index, title, content, lesson_type, points_reward, estimated_duration_mins)
SELECT id, 1,
  '{"en": "Processors, RAM and Storage", "yo": "Proseso, RAM ati Ibi Ipamo"}',
  '{
    "steps": [
      {"type": "story", "text": {"en": "The processor (CPU) is the brain of every device. It reads instructions and performs millions of calculations per second. A faster processor means your apps open quicker.", "yo": "Proseso (CPU) ni opolo gbogbo ero. O ka awon ilana ti o si se awon isiro milionu ni isejukan. Proseso ti o yara tumosi pe awon apu re yoo si ni kiakia."}, "illustration": "A glowing CPU chip on a circuit board with arrows showing data flowing in and out, Nigerian teenager studying it"},
      {"type": "quiz", "question": {"en": "What is the processor (CPU) often called?", "yo": "Kini a maa n pe proseso (CPU)?"}, "options": [{"text": {"en": "The brain of the device", "yo": "Opolo ero naa"}, "correct": true}, {"text": {"en": "The battery of the device", "yo": "Batiri ero naa"}, "correct": false}, {"text": {"en": "The screen of the device", "yo": "Iboju ero naa"}, "correct": false}], "hint": {"en": "It thinks and makes decisions", "yo": "O ronu ti o si pinnu"}},
      {"type": "story", "text": {"en": "RAM (Random Access Memory) is your device''s short-term memory. When you open an app, the data it needs is loaded into RAM for fast access. When you close the app, RAM clears that data.", "yo": "RAM (Random Access Memory) ni iranti igba diee ti ero re. Nigba ti o ba si apu kan, data ti o nilo ni a gbe sinu RAM fun iwole ni kiakia. Nigba ti o ba pa apu naa, RAM yoo nu data yen."}, "illustration": "A Nigerian student with a thought bubble showing RAM as a desk with papers that get cleared when done"},
      {"type": "quiz", "question": {"en": "What happens to data in RAM when you close an app?", "yo": "Kini o sele si data ninu RAM nigba ti o ba pa apu?"}, "options": [{"text": {"en": "It stays forever", "yo": "O wa titi lai"}, "correct": false}, {"text": {"en": "It gets cleared", "yo": "A ti nu u"}, "correct": true}, {"text": {"en": "It gets louder", "yo": "O pariwo si"}, "correct": false}], "hint": {"en": "RAM is temporary, like a whiteboard", "yo": "RAM je fun igba diee, bi paali funfun"}},
      {"type": "story", "text": {"en": "Storage (like SSD or hard drive) is long-term memory. Your photos, apps, and files live here even when the device is off. Storage is measured in gigabytes (GB) or terabytes (TB).", "yo": "Ibi ipamo (bi SSD tabi hard drive) ni iranti igba pipe. Awon foto re, apu, ati faili n gbe nibi paa ti a ba pa ero naa. A n won ibi ipamo ni gigabaiti (GB) tabi terabaiti (TB)."}, "illustration": "A diagram comparing RAM (fast, small desk) vs Storage (large filing cabinet) with a Nigerian teen pointing at both"},
      {"type": "voice", "prompt": {"en": "Say: The processor is the brain and RAM is short term memory", "yo": "So: Proseso ni opolo ati RAM ni iranti igba diee"}, "expected_text": "the processor is the brain and ram is short term memory", "language": "en"}
    ]
  }',
  'interactive', 15, 7
FROM courses WHERE title->>'en' = 'Inside Your Devices' AND min_age = 11;
