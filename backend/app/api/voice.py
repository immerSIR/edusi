from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse

from app.models.schemas import VoiceSynthesizeRequest
from app.services.voice_service import transcribe_audio, synthesize_speech

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = "en",
):
    """Transcribe audio to text. Supports 'en' (English) and 'yo' (Yoruba)."""
    audio_bytes = await audio.read()
    result = await transcribe_audio(audio_bytes, language)
    return result


@router.post("/synthesize")
async def synthesize(req: VoiceSynthesizeRequest):
    """Synthesize text to speech. Returns audio/wav stream."""
    audio_bytes = await synthesize_speech(req.text, req.language)
    return StreamingResponse(
        iter([audio_bytes]),
        media_type="audio/wav",
        headers={"Content-Disposition": "inline; filename=speech.wav"},
    )
