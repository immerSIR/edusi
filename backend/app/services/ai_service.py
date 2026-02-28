import json

import google.generativeai as genai

from app.core.config import settings

_configured = False


def _ensure_configured():
    global _configured
    if not _configured and settings.google_gemini_api_key:
        genai.configure(api_key=settings.google_gemini_api_key)
        _configured = True


async def generate_lesson_content(
    subject: str,
    topic: str,
    difficulty_level: int,
    target_language: str,
) -> dict:
    """Generate structured lesson content using Google Gemini."""
    _ensure_configured()

    prompt = f"""Generate a structured lesson for Nigerian children learning {subject}.

Topic: {topic}
Difficulty Level: {difficulty_level}/5
Languages: English and Yoruba (provide both translations)

Generate a lesson with 5-7 steps in this exact JSON format:
{{
  "title": {{"en": "English title", "yo": "Yoruba title"}},
  "description": {{"en": "English description", "yo": "Yoruba description"}},
  "steps": [
    {{
      "type": "story",
      "text": {{"en": "English text", "yo": "Yoruba translation"}},
      "illustration": "description of illustration showing Nigerian children"
    }},
    {{
      "type": "quiz",
      "question": {{"en": "English question?", "yo": "Yoruba question?"}},
      "options": [
        {{"text": {{"en": "Option A", "yo": "Aseyan A"}}, "correct": false}},
        {{"text": {{"en": "Option B", "yo": "Aseyan B"}}, "correct": true}},
        {{"text": {{"en": "Option C", "yo": "Aseyan C"}}, "correct": false}}
      ],
      "hint": {{"en": "Hint text", "yo": "Yoruba hint"}}
    }},
    {{
      "type": "voice",
      "prompt": {{"en": "Say: hello", "yo": "So: bawo ni"}},
      "expected_text": "hello",
      "language": "en"
    }}
  ]
}}

Make the content culturally relevant to Nigerian children. Use familiar Nigerian contexts, names, and scenarios. Include a mix of story, quiz, and voice steps.

Return ONLY the JSON, no markdown or explanation."""

    model = genai.GenerativeModel("gemini-2.0-flash")
    response = await model.generate_content_async(prompt)

    try:
        content = json.loads(response.text)
    except json.JSONDecodeError:
        # Try to extract JSON from the response
        text = response.text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            content = json.loads(text[start:end])
        else:
            raise ValueError("Failed to parse Gemini response as JSON")

    return content
