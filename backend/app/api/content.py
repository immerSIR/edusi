from fastapi import APIRouter

from app.models.schemas import ContentGenerateRequest
from app.services.ai_service import generate_lesson_content

router = APIRouter(prefix="/content", tags=["content"])


@router.post("/generate-lesson")
async def generate_lesson(req: ContentGenerateRequest):
    """Generate lesson content using Gemini. Admin endpoint."""
    result = await generate_lesson_content(
        subject=req.subject,
        topic=req.topic,
        difficulty_level=req.difficulty_level,
        target_language=req.target_language,
    )
    return result
