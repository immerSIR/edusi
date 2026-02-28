import io

from openai import AsyncOpenAI

from app.core.config import settings

_openai: AsyncOpenAI | None = None


def _get_openai() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        _openai = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai


async def transcribe_audio(audio_bytes: bytes, language: str) -> dict:
    """Transcribe audio to text.

    For MVP, uses OpenAI Whisper for both English and Yoruba.
    In production, Yoruba would use LyngualLabs/whisper-small-yoruba (self-hosted).
    """
    client = _get_openai()

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"

    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="yo" if language == "yo" else "en",
    )

    return {"text": transcript.text, "language": language}


async def synthesize_speech(text: str, language: str) -> bytes:
    """Synthesize text to speech.

    For MVP, uses OpenAI TTS for both languages.
    In production, Yoruba would use facebook/mms-tts-yor (self-hosted).
    """
    client = _get_openai()

    response = await client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text,
        response_format="wav",
    )

    return response.content
