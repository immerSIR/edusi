from app.api import voice
from app.models.schemas import VoiceSynthesizeRequest


class Upload:
    content_type = "audio/webm"
    size = None

    async def read(self, size=-1):
        return b"hello"


async def test_transcribe_reads_upload_and_returns_transcription(monkeypatch):
    async def fake_transcribe(audio_bytes, language, content_type=""):
        return {"text": audio_bytes.decode(), "confidence": 0.9, "language": language}

    monkeypatch.setattr(voice, "transcribe_audio", fake_transcribe)

    assert await voice.transcribe(Upload(), language="yo", current_user_id="parent-1") == {
        "text": "hello",
        "confidence": 0.9,
        "language": "yo",
    }


async def test_synthesize_streams_generated_audio(monkeypatch):
    async def fake_synthesize(text, language):
        return f"{language}:{text}".encode()

    monkeypatch.setattr(voice, "synthesize_speech", fake_synthesize)

    response = await voice.synthesize(
        VoiceSynthesizeRequest(text="hello", language="en"),
        current_user_id="parent-1",
    )
    chunks = [chunk async for chunk in response.body_iterator]

    assert response.media_type == "audio/wav"
    assert response.headers["content-disposition"] == "inline; filename=speech.wav"
    assert b"".join(chunks) == b"en:hello"
