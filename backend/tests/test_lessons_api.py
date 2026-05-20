import pytest
from fastapi import HTTPException

from app.api import lessons
from app.models.schemas import LessonProgressUpdate


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

    def order(self, value):
        self.calls.append(("order", value))
        return self

    def eq(self, column, value):
        self.calls.append(("eq", column, value))
        return self

    def single(self):
        self.calls.append(("single",))
        return self

    def update(self, value):
        self.calls.append(("update", value))
        return self

    def insert(self, value):
        self.calls.append(("insert", value))
        return self

    def execute(self):
        self.calls.append(("execute",))
        return Result(self.result)


class FakeSupabase:
    def __init__(self, table_results):
        self.table_results = {name: list(results) for name, results in table_results.items()}
        self.queries = []

    def table(self, name):
        result = self.table_results[name].pop(0)
        query = Query(result)
        self.queries.append((name, query))
        return query


@pytest.fixture
def use_db(monkeypatch):
    def apply(db):
        monkeypatch.setattr(lessons, "get_supabase", lambda: db)
        return db

    return apply


async def test_list_courses_filters_by_subject(use_db):
    db = use_db(FakeSupabase({"courses": [[{"id": "course-1"}]]}))

    result = await lessons.list_courses(subject="technology")

    assert result == [{"id": "course-1"}]
    assert db.queries[0][1].calls == [
        ("select", "*"),
        ("order", "difficulty_level"),
        ("eq", "subject", "technology"),
        ("execute",),
    ]


async def test_get_lesson_raises_404_when_missing(use_db):
    use_db(FakeSupabase({"lessons": [None]}))

    with pytest.raises(HTTPException) as exc:
        await lessons.get_lesson("lesson-missing")

    assert exc.value.status_code == 404
    assert exc.value.detail == "Lesson not found"


async def test_update_progress_updates_existing_progress(use_db):
    db = use_db(
        FakeSupabase(
            {
                "children": [[{"id": "child-1"}]],
                "lesson_progress": [
                    [
                        {
                            "id": "progress-1",
                            "score": 2,
                            "responses": {"0": {"answer": "old"}},
                            "attempts": 3,
                        }
                    ],
                    [{"id": "progress-1"}],
                ]
            }
        )
    )
    req = LessonProgressUpdate(
        child_id="child-1",
        step_index=1,
        response={"answer": "new"},
        correct=True,
    )

    assert await lessons.update_progress(
        "lesson-1",
        req,
        current_user_id="parent-1",
    ) == {"message": "Progress updated"}

    update_calls = db.queries[2][1].calls
    assert update_calls[0] == (
        "update",
        {
            "status": "in_progress",
            "score": 3,
            "responses": {"0": {"answer": "old"}, "1": {"answer": "new"}},
            "attempts": 4,
        },
    )
    assert ("eq", "id", "progress-1") in update_calls


async def test_update_progress_inserts_new_progress(use_db):
    db = use_db(
        FakeSupabase(
            {
                "children": [[{"id": "child-1"}]],
                "lesson_progress": [[], [{"id": "progress-2"}]],
            }
        )
    )
    req = LessonProgressUpdate(
        child_id="child-1",
        step_index=2,
        response={"answer": "A"},
        correct=False,
    )

    assert await lessons.update_progress(
        "lesson-1",
        req,
        current_user_id="parent-1",
    ) == {"message": "Progress updated"}

    assert db.queries[2][1].calls[0] == (
        "insert",
        {
            "child_id": "child-1",
            "lesson_id": "lesson-1",
            "status": "in_progress",
            "score": 0,
            "responses": {"2": {"answer": "A"}},
            "attempts": 1,
        },
    )


async def test_get_next_lesson_returns_first_uncompleted_lesson(use_db):
    use_db(
        FakeSupabase(
            {
                "children": [[{"id": "child-1"}]],
                "lesson_progress": [[{"lesson_id": "lesson-1", "score": 1}]],
                "lessons": [
                    [
                        {"id": "lesson-1", "course_id": "course-1", "title": {"en": "One"}},
                        {"id": "lesson-2", "course_id": "course-1", "title": {"en": "Two"}},
                    ]
                ],
            }
        )
    )

    assert await lessons.get_next_lesson("child-1", current_user_id="parent-1") == {
        "lesson_id": "lesson-2",
        "course_id": "course-1",
        "title": {"en": "Two"},
        "reason": "Next in sequence",
    }


async def test_get_child_stats_calculates_accuracy_from_completed_lessons(use_db):
    use_db(
        FakeSupabase(
            {
                "children": [[{"id": "child-1"}], {"total_points": 75, "current_level": 3}],
                "lesson_progress": [[{"score": 1}, {"score": 0}, {"score": 1}]],
            }
        )
    )

    assert await lessons.get_child_stats("child-1", current_user_id="parent-1") == {
        "total_points": 75,
        "current_level": 3,
        "lessons_completed": 3,
        "accuracy": pytest.approx(66.6666666667),
        "streak_days": 0,
    }
