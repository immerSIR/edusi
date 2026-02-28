import httpx

from app.core.config import settings


async def translate_text(text: str, source: str, target: str) -> str:
    """Translate text using Google Translate API."""
    if not settings.google_translate_api_key:
        # Dev mode: return original text with prefix
        return f"[{target}] {text}"

    url = "https://translation.googleapis.com/language/translate/v2"
    params = {
        "q": text,
        "source": source,
        "target": target,
        "key": settings.google_translate_api_key,
        "format": "text",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, params=params)
        data = response.json()

    return data["data"]["translations"][0]["translatedText"]
