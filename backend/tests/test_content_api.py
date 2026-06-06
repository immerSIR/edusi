import pytest
from fastapi import BackgroundTasks
from fastapi import HTTPException

from app.api import content
from app.models.schemas import (
    ContentGenerateRequest,
    CourseGenerateRequest,
    CourseThumbnailRequest,
    IllustrationGenerateRequest,
    StepIllustrationRequest,
)


class Result:
    def __init__(self, data):
        self.data = data


class Query:
    def __init__(self, result):
        self.result = result
        self.calls = []

    def select(self, value):
        self.calls.append(("select", value))
        return self

    def insert(self, value):
        self.calls.append(("insert", value))
        return self

    def eq(self, column, value):
        self.calls.append(("eq", column, value))
        return self

    def limit(self, value):
        self.calls.append(("limit", value))
        return self

    def single(self):
        self.calls.append(("single",))
        return self

    def execute(self):
        self.calls.append(("execute",))
        return Result(self.result)


class Bucket:
    def __init__(self, files=None, fail_upload=False):
        self.files = files or []
        self.fail_upload = fail_upload
        self.uploads = []

    def list(self, path=""):
        return self.files

    def get_public_url(self, path):
        return f"https://cdn.example/{path}"

    def upload(self, path, file, file_options):
        if self.fail_upload:
            raise RuntimeError("upload failed")
        self.uploads.append((path, file, file_options))


class Storage:
    def __init__(self, bucket):
        self.bucket = bucket

    def from_(self, name):
        self.name = name
        return self.bucket


class FakeSupabase:
    def __init__(self, table_results=None, bucket=None):
        self.table_results = {name: list(results) for name, results in (table_results or {}).items()}
        self.queries = []
        self.storage = Storage(bucket or Bucket())

    def table(self, name):
        result = self.table_results[name].pop(0)
        query = Query(result)
        self.queries.append((name, query))
        return query


@pytest.fixture
def use_db(monkeypatch):
    def apply(db):
        monkeypatch.setattr(content, "get_supabase", lambda: db)
        return db

    return apply


async def test_generate_lesson_delegates_to_ai_service(monkeypatch):
    captured = {}

    async def fake_generate(**kwargs):
        captured.update(kwargs)
        return {"title": {"en": "Internet Safety"}}

    monkeypatch.setattr(content, "generate_lesson_content", fake_generate)

    result = await content.generate_lesson(
        ContentGenerateRequest(subject="technology", topic="Internet Safety", max_age=10),
        current_user_id="parent-1",
    )

    assert result == {"title": {"en": "Internet Safety"}}
    assert captured == {
        "subject": "technology",
        "topic": "Internet Safety",
        "difficulty_level": 1,
        "target_language": "en",
        "min_age": 3,
        "max_age": 10,
    }


async def test_generate_course_inserts_course_and_lessons(monkeypatch, use_db):
    async def fake_generate(**kwargs):
        return {
            "course_title": {"en": "Robotics"},
            "course_description": {"en": "Build things"},
            "subject": "technology",
            "difficulty_level": 2,
            "min_age": 7,
            "max_age": 10,
            "lessons": [
                {"title": {"en": "Motors"}, "steps": [{"type": "story"}]},
                {"title": {"en": "Sensors"}, "steps": [{"type": "quiz"}]},
            ],
        }

    monkeypatch.setattr(content, "generate_course_with_lessons", fake_generate)
    db = use_db(FakeSupabase({"courses": [[{"id": "course-1"}]], "lessons": [[{"id": "lesson-1"}]]}))

    result = await content.generate_course(
        CourseGenerateRequest(subject="technology", child_age=8),
        current_user_id="parent-1",
    )

    assert result == {"course_id": "course-1", "title": {"en": "Robotics"}, "lessons_count": 2}
    assert db.queries[0][0] == "courses"
    assert db.queries[1][1].calls[0][0] == "insert"
    assert len(db.queries[1][1].calls[0][1]) == 2


async def test_generate_course_raises_when_course_insert_fails(monkeypatch, use_db):
    async def fake_generate(**kwargs):
        return {
            "course_title": {"en": "Robotics"},
            "course_description": {"en": "Build things"},
            "subject": "technology",
            "min_age": 7,
            "max_age": 10,
            "lessons": [],
        }

    monkeypatch.setattr(content, "generate_course_with_lessons", fake_generate)
    use_db(FakeSupabase({"courses": [[]]}))

    with pytest.raises(HTTPException) as exc:
        await content.generate_course(
            CourseGenerateRequest(),
            current_user_id="parent-1",
        )

    assert exc.value.status_code == 500
    assert exc.value.detail == "Failed to create course"


async def test_auto_generate_lessons_returns_existing_state(use_db):
    use_db(FakeSupabase({"lessons": [[{"id": "lesson-1"}]]}))

    result = await content.auto_generate_lessons(
        "course-1",
        BackgroundTasks(),
        current_user_id="parent-1",
    )

    assert result == {"status": "exists", "count": 1}


async def test_auto_generate_lessons_returns_generating_state(use_db):
    use_db(FakeSupabase({"lessons": [[]]}))
    content._generating_courses.add("course-1")
    try:
        result = await content.auto_generate_lessons(
            "course-1",
            BackgroundTasks(),
            current_user_id="parent-1",
        )
    finally:
        content._generating_courses.discard("course-1")

    assert result == {"status": "generating"}


async def test_auto_generate_lessons_returns_error_for_missing_course(use_db):
    use_db(FakeSupabase({"lessons": [[]], "courses": [None]}))

    result = await content.auto_generate_lessons(
        "course-1",
        BackgroundTasks(),
        current_user_id="parent-1",
    )

    assert result == {"status": "error", "message": "Course not found"}


async def test_auto_generate_lessons_starts_background_task(use_db):
    tasks = BackgroundTasks()
    course = {"id": "course-1", "title": {"en": "Robotics"}, "subject": "technology"}
    use_db(FakeSupabase({"lessons": [[]], "courses": [course]}))

    result = await content.auto_generate_lessons(
        "course-1",
        tasks,
        current_user_id="parent-1",
    )

    assert result == {"status": "started"}
    assert "course-1" in content._generating_courses
    assert len(tasks.tasks) == 1
    content._generating_courses.discard("course-1")


async def test_run_lesson_generation_inserts_generated_lesson(monkeypatch, use_db):
    async def fake_generate(**kwargs):
        return {"title": {"en": "Intro"}, "steps": [{"type": "story"}]}

    monkeypatch.setattr(content, "generate_lesson_content", fake_generate)
    db = use_db(FakeSupabase({"lessons": [[{"id": "lesson-1"}]]}))

    content._generating_courses.add("course-1")
    await content._run_lesson_generation(
        "course-1",
        {
            "subject": "technology",
            "title": {"en": "Robotics"},
            "difficulty_level": 2,
            "min_age": 7,
            "max_age": 10,
        },
    )

    assert db.queries[0][1].calls[0] == (
        "insert",
        {
            "course_id": "course-1",
            "order_index": 1,
            "title": {"en": "Intro"},
            "content": {"steps": [{"type": "story"}]},
            "lesson_type": "interactive",
            "points_reward": 10,
            "estimated_duration_mins": 5,
        },
    )
    assert "course-1" not in content._generating_courses


async def test_generate_illustration_endpoint_delegates(monkeypatch):
    async def fake_generate(description, style):
        return {"image_base64": "aW1hZ2U=", "mime_type": "image/png", "prompt_used": style}

    monkeypatch.setattr(content, "generate_illustration", fake_generate)

    result = await content.generate_illustration_endpoint(
        IllustrationGenerateRequest(description="children at school", style="bright"),
        current_user_id="parent-1",
    )

    assert result == {"image_base64": "aW1hZ2U=", "mime_type": "image/png", "prompt_used": "bright"}


async def test_step_illustration_returns_cached_url(use_db):
    use_db(FakeSupabase(bucket=Bucket(files=[{"name": "lesson-1_2.png"}])))

    result = await content.step_illustration(
        StepIllustrationRequest(lesson_id="lesson-1", step_index=2, description="robot"),
        current_user_id="parent-1",
    )

    assert result == {"url": "https://cdn.example/lesson-1_2.png", "cached": True}


async def test_step_illustration_falls_back_to_data_url_when_upload_fails(monkeypatch, use_db):
    async def fake_generate(description):
        return {"image_base64": "aW1hZ2U="}

    monkeypatch.setattr(content, "generate_illustration", fake_generate)
    use_db(FakeSupabase(bucket=Bucket(fail_upload=True)))

    result = await content.step_illustration(
        StepIllustrationRequest(lesson_id="lesson-1", step_index=2, description="robot"),
        current_user_id="parent-1",
    )

    assert result == {"url": "data:image/png;base64,aW1hZ2U=", "cached": False}


async def test_course_thumbnail_generates_and_uploads_when_not_cached(monkeypatch, use_db):
    async def fake_generate(description, style):
        return {"image_base64": "aW1hZ2U="}

    bucket = Bucket()
    monkeypatch.setattr(content, "generate_illustration", fake_generate)
    use_db(FakeSupabase(bucket=bucket))

    result = await content.course_thumbnail(
        CourseThumbnailRequest(course_id="course-1", description="robotics"),
        current_user_id="parent-1",
    )

    assert result == {"url": "https://cdn.example/course_course-1.png", "cached": False}
    assert bucket.uploads[0][0] == "course_course-1.png"
