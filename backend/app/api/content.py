import base64
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.models.schemas import (
    ContentGenerateRequest,
    CourseGenerateRequest,
    CourseThumbnailRequest,
    IllustrationGenerateRequest,
    StepIllustrationRequest,
)
from app.services.ai_service import generate_course_with_lessons, generate_lesson_content
from app.services.illustration_service import generate_illustration
from app.db.supabase import get_supabase
from app.core.security import require_current_user_id, require_direct_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["content"])

# In-memory lock to prevent duplicate generation for the same course
_generating_courses: set[str] = set()


@router.post("/generate-lesson")
async def generate_lesson(
    req: ContentGenerateRequest,
    current_user_id: str = Depends(require_current_user_id),
):
    """Generate lesson content using Gemini. Admin endpoint."""
    require_direct_user_id(current_user_id)
    result = await generate_lesson_content(
        subject=req.subject,
        topic=req.topic,
        difficulty_level=req.difficulty_level,
        target_language=req.target_language,
        min_age=req.min_age,
        max_age=req.max_age,
    )
    return result


@router.post("/generate-course")
async def generate_course(
    req: CourseGenerateRequest,
    current_user_id: str = Depends(require_current_user_id),
):
    """Generate an entire course with lessons based on child's age and progress."""
    require_direct_user_id(current_user_id)
    sb = get_supabase()

    result = await generate_course_with_lessons(
        subject=req.subject,
        child_age=req.child_age,
        covered_topics=req.covered_topics,
    )

    # Insert the course into Supabase
    course_data = {
        "title": result["course_title"],
        "description": result["course_description"],
        "subject": result["subject"],
        "difficulty_level": result.get("difficulty_level", 1),
        "min_age": result["min_age"],
        "max_age": result["max_age"],
        "is_premium": False,
        "thumbnail_url": "",
    }

    course_res = sb.table("courses").insert(course_data).execute()
    if not course_res.data:
        # Surface a real HTTP error so the client's `res.ok` guard trips and
        # the user sees the generation failure instead of a silent 200.
        raise HTTPException(status_code=500, detail="Failed to create course")

    course_id = course_res.data[0]["id"]

    # Insert lessons
    lessons_to_insert = []
    for i, lesson in enumerate(result.get("lessons", [])):
        lessons_to_insert.append({
            "course_id": course_id,
            "order_index": i + 1,
            "title": lesson["title"],
            "content": {"steps": lesson["steps"]},
            "lesson_type": "interactive",
            "points_reward": 10,
            "estimated_duration_mins": 5,
        })

    if lessons_to_insert:
        sb.table("lessons").insert(lessons_to_insert).execute()

    return {
        "course_id": course_id,
        "title": result["course_title"],
        "lessons_count": len(lessons_to_insert),
    }


@router.post("/courses/{course_id}/auto-generate")
async def auto_generate_lessons(
    course_id: str,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(require_current_user_id),
):
    """Idempotent endpoint: generates lessons for a course if none exist.

    Safe to call multiple times — deduplicates via in-memory lock and DB check.
    Generation runs as a background task so the response returns immediately.
    """
    require_direct_user_id(current_user_id)
    sb = get_supabase()

    # Check if lessons already exist
    existing = sb.table("lessons").select("id").eq("course_id", course_id).limit(1).execute()
    if existing.data:
        return {"status": "exists", "count": len(existing.data)}

    # Check if already generating
    if course_id in _generating_courses:
        return {"status": "generating"}

    # Get course data
    course_res = sb.table("courses").select("*").eq("id", course_id).single().execute()
    if not course_res.data:
        return {"status": "error", "message": "Course not found"}

    # Mark as generating and start background task
    _generating_courses.add(course_id)
    background_tasks.add_task(_run_lesson_generation, course_id, course_res.data)
    return {"status": "started"}


async def _run_lesson_generation(course_id: str, course_data: dict):
    """Background task that generates and inserts lessons for a course."""
    try:
        sb = get_supabase()
        result = await generate_lesson_content(
            subject=course_data["subject"],
            topic=course_data["title"]["en"] if isinstance(course_data["title"], dict) else course_data["title"],
            difficulty_level=course_data.get("difficulty_level", 1),
            target_language="en",
            min_age=course_data.get("min_age", 3),
            max_age=course_data.get("max_age", 16),
        )

        lesson_data = {
            "course_id": course_id,
            "order_index": 1,
            "title": result["title"],
            "content": {"steps": result["steps"]},
            "lesson_type": "interactive",
            "points_reward": 10,
            "estimated_duration_mins": 5,
        }

        sb.table("lessons").insert(lesson_data).execute()
        logger.info(f"Auto-generated lesson for course {course_id}")
    except Exception as e:
        logger.error(f"Failed to auto-generate lesson for course {course_id}: {e}")
    finally:
        _generating_courses.discard(course_id)


@router.post("/generate-illustration")
async def generate_illustration_endpoint(
    req: IllustrationGenerateRequest,
    current_user_id: str = Depends(require_current_user_id),
):
    """Generate a culturally relevant illustration using Gemini Imagen. Admin endpoint."""
    require_direct_user_id(current_user_id)
    result = await generate_illustration(
        description=req.description,
        style=req.style,
    )
    return result


@router.post("/step-illustration")
async def step_illustration(
    req: StepIllustrationRequest,
    current_user_id: str = Depends(require_current_user_id),
):
    """Generate and cache an illustration for a lesson step.

    Checks Supabase Storage first — returns cached URL if exists.
    Otherwise generates via Gemini Imagen, uploads to Storage, returns public URL.
    """
    require_direct_user_id(current_user_id)
    sb = get_supabase()
    bucket = "illustrations"
    path = f"{req.lesson_id}_{req.step_index}.png"

    # Check if already cached in Storage
    try:
        files = sb.storage.from_(bucket).list(path="")
        if any(f["name"] == path for f in (files or [])):
            public_url = sb.storage.from_(bucket).get_public_url(path)
            return {"url": public_url, "cached": True}
    except Exception:
        pass

    # Generate new illustration
    result = await generate_illustration(description=req.description)
    image_bytes = base64.b64decode(result["image_base64"])

    # Upload to Supabase Storage
    try:
        sb.storage.from_(bucket).upload(
            path=path,
            file=image_bytes,
            file_options={"content-type": "image/png", "upsert": "true"},
        )
        public_url = sb.storage.from_(bucket).get_public_url(path)
        return {"url": public_url, "cached": False}
    except Exception as e:
        logger.error(f"Failed to upload illustration: {e}")
        return {
            "url": f"data:image/png;base64,{result['image_base64']}",
            "cached": False,
        }


@router.post("/course-thumbnail")
async def course_thumbnail(
    req: CourseThumbnailRequest,
    current_user_id: str = Depends(require_current_user_id),
):
    """Generate and cache a thumbnail illustration for a course card.

    Checks Supabase Storage first — returns cached URL if exists.
    Otherwise generates via Gemini Imagen, uploads to Storage, returns public URL.
    """
    require_direct_user_id(current_user_id)
    sb = get_supabase()
    bucket = "illustrations"
    path = f"course_{req.course_id}.png"

    # Check if already cached in Storage
    try:
        files = sb.storage.from_(bucket).list(path="")
        if any(f["name"] == path for f in (files or [])):
            public_url = sb.storage.from_(bucket).get_public_url(path)
            return {"url": public_url, "cached": True}
    except Exception:
        pass

    # Generate new thumbnail
    result = await generate_illustration(
        description=req.description,
        style="colorful children's educational book cover illustration",
    )
    image_bytes = base64.b64decode(result["image_base64"])

    # Upload to Supabase Storage
    try:
        sb.storage.from_(bucket).upload(
            path=path,
            file=image_bytes,
            file_options={"content-type": "image/png", "upsert": "true"},
        )
        public_url = sb.storage.from_(bucket).get_public_url(path)
        return {"url": public_url, "cached": False}
    except Exception as e:
        logger.error(f"Failed to upload course thumbnail: {e}")
        return {
            "url": f"data:image/png;base64,{result['image_base64']}",
            "cached": False,
        }
