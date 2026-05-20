import asyncio
import base64
import io
import logging

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.google_gemini_api_key)
    return _client


async def generate_illustration(
    description: str,
    style: str = "colorful children's book illustration",
) -> dict:
    """Generate a culturally relevant illustration using Gemini 3.1 Flash Image.

    Returns dict with base64-encoded image data and mime type.
    Runs the synchronous Gemini client call in a thread pool to avoid blocking.
    """
    client = _get_client()

    prompt = (
        f"Generate a {style}, depicting Nigerian children in a familiar local setting. "
        f"Bright, warm colors. Child-friendly, educational. "
        f"Scene: {description}"
    )

    def _generate():
        return client.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )

    response = await asyncio.to_thread(_generate)

    # Extract image from response parts
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_bytes = part.inline_data.data
            mime_type = part.inline_data.mime_type or "image/png"
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            return {
                "image_base64": b64,
                "mime_type": mime_type,
                "prompt_used": prompt,
            }

    raise ValueError("No image generated — prompt may have been blocked by safety filters")
