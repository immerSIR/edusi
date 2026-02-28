from fastapi import APIRouter, HTTPException

from app.db.supabase import get_supabase
from app.models.schemas import LessonProgressUpdate

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/courses")
async def list_courses(subject: str | None = None):
    """List all courses, optionally filtered by subject."""
    db = get_supabase()
    query = db.table("courses").select("*").order("difficulty_level")
    if subject:
        query = query.eq("subject", subject)
    result = query.execute()
    return result.data


@router.get("/courses/{course_id}/lessons")
async def list_lessons(course_id: str):
    """List all lessons for a course."""
    db = get_supabase()
    result = (
        db.table("lessons")
        .select("id, course_id, order_index, title, lesson_type, points_reward, estimated_duration_mins")
        .eq("course_id", course_id)
        .order("order_index")
        .execute()
    )
    return result.data


@router.get("/{lesson_id}")
async def get_lesson(lesson_id: str):
    """Get a single lesson with full content."""
    db = get_supabase()
    result = (
        db.table("lessons").select("*").eq("id", lesson_id).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return result.data


@router.post("/{lesson_id}/progress")
async def update_progress(lesson_id: str, req: LessonProgressUpdate):
    """Update lesson progress for a child."""
    db = get_supabase()

    # Get existing progress or create new
    existing = (
        db.table("lesson_progress")
        .select("*")
        .eq("child_id", req.child_id)
        .eq("lesson_id", lesson_id)
        .execute()
    )

    if existing.data:
        progress = existing.data[0]
        responses = progress.get("responses", {})
        responses[str(req.step_index)] = req.response
        score = (progress.get("score") or 0) + (1 if req.correct else 0)

        db.table("lesson_progress").update(
            {
                "status": "in_progress",
                "score": score,
                "responses": responses,
                "attempts": progress.get("attempts", 0) + 1,
            }
        ).eq("id", progress["id"]).execute()
    else:
        db.table("lesson_progress").insert(
            {
                "child_id": req.child_id,
                "lesson_id": lesson_id,
                "status": "in_progress",
                "score": 1 if req.correct else 0,
                "responses": {str(req.step_index): req.response},
                "attempts": 1,
            }
        ).execute()

    return {"message": "Progress updated"}


@router.get("/next")
async def get_next_lesson(child_id: str):
    """Get the recommended next lesson for a child based on adaptive difficulty."""
    db = get_supabase()

    # Get child's completed lessons
    completed = (
        db.table("lesson_progress")
        .select("lesson_id, score")
        .eq("child_id", child_id)
        .eq("status", "completed")
        .execute()
    )
    completed_ids = [p["lesson_id"] for p in (completed.data or [])]

    # Get all lessons ordered by difficulty
    all_lessons = (
        db.table("lessons")
        .select("id, course_id, title, order_index")
        .order("order_index")
        .execute()
    )

    # Find first uncompleted lesson
    for lesson in all_lessons.data or []:
        if lesson["id"] not in completed_ids:
            return {
                "lesson_id": lesson["id"],
                "course_id": lesson["course_id"],
                "title": lesson["title"],
                "reason": "Next in sequence",
            }

    return {"message": "All lessons completed!"}


@router.get("/children/{child_id}/stats")
async def get_child_stats(child_id: str):
    """Get gamification stats for a child."""
    db = get_supabase()

    child = (
        db.table("children").select("*").eq("id", child_id).single().execute()
    )
    if not child.data:
        raise HTTPException(status_code=404, detail="Child not found")

    completed = (
        db.table("lesson_progress")
        .select("score")
        .eq("child_id", child_id)
        .eq("status", "completed")
        .execute()
    )

    lessons_completed = len(completed.data or [])
    total_score = sum(p.get("score", 0) for p in (completed.data or []))
    total_possible = lessons_completed  # simplified

    return {
        "total_points": child.data["total_points"],
        "current_level": child.data["current_level"],
        "lessons_completed": lessons_completed,
        "accuracy": (total_score / total_possible * 100) if total_possible > 0 else 0,
        "streak_days": 0,  # TODO: implement streak tracking
    }


@router.get("/children/{child_id}/achievements")
async def get_child_achievements(child_id: str):
    """Get earned achievements for a child."""
    db = get_supabase()
    result = (
        db.table("child_achievements")
        .select("*, achievements(*)")
        .eq("child_id", child_id)
        .execute()
    )
    return result.data or []
