import json

from google import genai
from google.genai import types

from app.core.config import settings

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.google_gemini_api_key)
    return _client


async def generate_lesson_content(
    subject: str,
    topic: str,
    difficulty_level: int,
    target_language: str,
    min_age: int = 3,
    max_age: int = 16,
) -> dict:
    """Generate structured lesson content using Google Gemini."""
    client = _get_client()

    # Age-adapted vocabulary and complexity guidance
    if max_age <= 6:
        age_guidance = (
            "Target audience: ages 3-6. Use VERY simple words (1-2 syllables). "
            "Stories should be 1-2 short sentences. Use 2-3 quiz options only. "
            "Voice prompts should be 3-6 words maximum. "
            "Use concrete, familiar objects (animals, food, family members). "
            "Be warm, playful, and encouraging."
        )
    elif max_age <= 10:
        age_guidance = (
            "Target audience: ages 7-10. Use simple sentences with relatable analogies. "
            "Stories can be 2-3 sentences. Use 3 quiz options. "
            "Voice prompts should be 5-10 words. "
            "Introduce basic technical terms but always explain them simply. "
            "Compare new concepts to everyday things kids know."
        )
    else:
        age_guidance = (
            "Target audience: ages 11-16. Use full explanations with proper technical terms. "
            "Stories can be 2-4 sentences with detail. Use 3 quiz options. "
            "Voice prompts should be 8-15 words. "
            "Introduce industry terminology and explain how systems work together. "
            "Encourage critical thinking."
        )

    prompt = f"""Generate a structured lesson for Nigerian children learning {subject}.

Topic: {topic}
Difficulty Level: {difficulty_level}/5
Languages: English and Yoruba (provide both translations)
{age_guidance}

CRITICAL RULES:
- ALL steps (story, quiz, voice) MUST be directly about the topic "{topic}". No generic or off-topic content.
- Voice steps must ask the child to say a key term, definition, or fact FROM the lesson topic. For example, if the topic is "Artificial Intelligence", the voice prompt should be "Say: Artificial Intelligence helps computers learn" — NOT "Say: My name is..." or other unrelated phrases.
- Quiz questions must test knowledge about "{topic}" specifically.
- Story steps must teach concepts about "{topic}".
- YORUBA LANGUAGE: Write Yoruba the way Nigerians actually speak — naturally code-switching with English for terms commonly used in English in daily Nigerian life. Do NOT invent artificial Yoruba translations for universally known English terms. For example: write "keyboard" not "paadi tite", "mouse" not "asin", "screen" not "iboju", "computer" not "ero isiro", "battery" not "batiri agbara". This especially applies to technology, science, and math vocabulary. Only use established Yoruba words that people actually say (e.g., "ile-iwe" for school, "oja" for market).

Generate a lesson with 5-7 steps in this exact JSON format:
{{
  "title": {{"en": "English title", "yo": "Yoruba title"}},
  "description": {{"en": "English description", "yo": "Yoruba description"}},
  "steps": [
    {{
      "type": "story",
      "text": {{"en": "English text about {topic}", "yo": "Yoruba translation"}},
      "illustration": "description of illustration showing Nigerian children learning about {topic}"
    }},
    {{
      "type": "quiz",
      "question": {{"en": "Question about {topic}?", "yo": "Yoruba question?"}},
      "options": [
        {{"text": {{"en": "Option A", "yo": "Aseyan A"}}, "correct": false}},
        {{"text": {{"en": "Option B", "yo": "Aseyan B"}}, "correct": true}},
        {{"text": {{"en": "Option C", "yo": "Aseyan C"}}, "correct": false}}
      ],
      "hint": {{"en": "Hint text", "yo": "Yoruba hint"}}
    }},
    {{
      "type": "voice",
      "prompt": {{"en": "Say: a key phrase about {topic}", "yo": "So: Yoruba translation"}},
      "expected_text": "a key phrase about {topic}",
      "language": "en"
    }}
  ]
}}

Make the content culturally relevant to Nigerian children. Use familiar Nigerian contexts, names, and scenarios. Include a mix of story, quiz, and voice steps. Every step must directly relate to "{topic}".

Return ONLY the JSON, no markdown or explanation."""

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    return json.loads(response.text)


def _age_guidance(child_age: int) -> tuple[str, int, int]:
    """Return (guidance text, min_age, max_age) for a given child age."""
    if child_age <= 6:
        return (
            "Target audience: ages 3-6. Use VERY simple words (1-2 syllables). "
            "Stories should be 1-2 short sentences. Use 2-3 quiz options only. "
            "Voice prompts should be 3-6 words maximum. "
            "Use concrete, familiar objects (animals, food, family members). "
            "Be warm, playful, and encouraging.",
            3,
            6,
        )
    elif child_age <= 10:
        return (
            "Target audience: ages 7-10. Use simple sentences with relatable analogies. "
            "Stories can be 2-3 sentences. Use 3 quiz options. "
            "Voice prompts should be 5-10 words. "
            "Introduce basic technical terms but always explain them simply. "
            "Compare new concepts to everyday things kids know.",
            7,
            10,
        )
    else:
        return (
            "Target audience: ages 11-16. Use full explanations with proper technical terms. "
            "Stories can be 2-4 sentences with detail. Use 3 quiz options. "
            "Voice prompts should be 8-15 words. "
            "Introduce industry terminology and explain how systems work together. "
            "Encourage critical thinking.",
            11,
            16,
        )


async def generate_course_with_lessons(
    subject: str,
    child_age: int,
    covered_topics: list[str],
) -> dict:
    """Generate an entire course (title, description, and 3 lessons) using Gemini.

    Picks a new topic the child hasn't covered yet, slightly more advanced
    than what they've already done.
    """
    client = _get_client()
    age_text, min_age, max_age = _age_guidance(child_age)

    covered_list = ", ".join(covered_topics) if covered_topics else "none yet"

    prompt = f"""You are designing a bilingual (English and Yoruba) {subject} course for Nigerian children aged {child_age}.

The child has already covered these topics: {covered_list}

Pick a NEW topic they haven't studied yet that is slightly more advanced than what they've covered. The topic should be interesting, educational, and culturally relevant to Nigerian children.

{age_text}

CRITICAL RULES:
- ALL steps (story, quiz, voice) in EVERY lesson MUST be directly about the chosen course topic. No generic or off-topic content.
- Voice steps must ask the child to say a key term, definition, or fact from the lesson. For example, if the topic is "Internet Safety", a voice prompt should be "Say: I should never share my password" — NOT "Say: My name is..." or other unrelated phrases.
- Quiz questions must test knowledge about the specific lesson topic.
- Story steps must teach concepts about the specific lesson topic.
- YORUBA LANGUAGE: Write Yoruba the way Nigerians actually speak — naturally code-switching with English for terms commonly used in English in daily Nigerian life. Do NOT invent artificial Yoruba translations for universally known English terms. For example: write "keyboard" not "paadi tite", "mouse" not "asin", "screen" not "iboju", "computer" not "ero isiro", "battery" not "batiri agbara". This especially applies to technology, science, and math vocabulary. Only use established Yoruba words that people actually say (e.g., "ile-iwe" for school, "oja" for market).

Generate a complete course with 3 lessons in this exact JSON format:
{{
  "course_title": {{"en": "English course title", "yo": "Yoruba course title"}},
  "course_description": {{"en": "1-2 sentence English description", "yo": "Yoruba description"}},
  "difficulty_level": <number 1-5>,
  "lessons": [
    {{
      "title": {{"en": "Lesson 1 title", "yo": "Yoruba title"}},
      "steps": [
        {{
          "type": "story",
          "text": {{"en": "Story text teaching about the topic", "yo": "Yoruba translation"}},
          "illustration": "description of illustration showing Nigerian children learning about the topic"
        }},
        {{
          "type": "quiz",
          "question": {{"en": "Question testing topic knowledge?", "yo": "Yoruba question?"}},
          "options": [
            {{"text": {{"en": "Option A", "yo": "Aseyan A"}}, "correct": false}},
            {{"text": {{"en": "Option B", "yo": "Aseyan B"}}, "correct": true}},
            {{"text": {{"en": "Option C", "yo": "Aseyan C"}}, "correct": false}}
          ],
          "hint": {{"en": "Hint text", "yo": "Yoruba hint"}}
        }},
        {{
          "type": "voice",
          "prompt": {{"en": "Say: a key phrase about the topic", "yo": "So: Yoruba translation"}},
          "expected_text": "a key phrase about the topic",
          "language": "en"
        }}
      ]
    }}
  ]
}}

Each lesson should have 5-7 steps with a mix of story, quiz, and voice steps.
Make all content culturally relevant to Nigerian children with familiar names, contexts, and scenarios.
Every single step must directly relate to the course topic.

Return ONLY the JSON, no markdown or explanation."""

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    result = json.loads(response.text)
    result["min_age"] = min_age
    result["max_age"] = max_age
    result["subject"] = subject
    return result
