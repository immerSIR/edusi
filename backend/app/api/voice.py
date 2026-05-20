from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.security import require_current_user_id, require_direct_user_id
from app.models.schemas import VoiceSynthesizeRequest
from app.services.voice_service import transcribe_audio, synthesize_speech

router = APIRouter(prefix="/voice", tags=["voice"])
MAX_AUDIO_UPLOAD_BYTES = settings.max_audio_upload_bytes
MAX_TTS_TEXT_CHARS = settings.max_tts_text_chars


@router.post("/transcribe")
async def transcribe(
    audio: Annotated[UploadFile, File(...)],
    language: str = "en",
    current_user_id: str = Depends(require_current_user_id),
):
    """Transcribe audio to text. Supports 'en' (English) and 'yo' (Yoruba)."""
    require_direct_user_id(current_user_id)
    if language not in {"en", "yo"}:
        raise HTTPException(status_code=400, detail="Unsupported language")
    if audio.size is not None and audio.size > MAX_AUDIO_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large")

    audio_bytes = await audio.read(MAX_AUDIO_UPLOAD_BYTES + 1)
    if len(audio_bytes) > MAX_AUDIO_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large")
    result = await transcribe_audio(audio_bytes, language, content_type=audio.content_type or "")
    return result


@router.post("/synthesize")
async def synthesize(
    req: VoiceSynthesizeRequest,
    current_user_id: str = Depends(require_current_user_id),
):
    """Synthesize text to speech. Returns audio/wav stream."""
    require_direct_user_id(current_user_id)
    if req.language not in {"en", "yo"}:
        raise HTTPException(status_code=400, detail="Unsupported language")
    if len(req.text) > MAX_TTS_TEXT_CHARS:
        raise HTTPException(status_code=413, detail="Text too long")
    audio_bytes = await synthesize_speech(req.text, req.language)
    return StreamingResponse(
        iter([audio_bytes]),
        media_type="audio/wav",
        headers={"Content-Disposition": "inline; filename=speech.wav"},
    )
