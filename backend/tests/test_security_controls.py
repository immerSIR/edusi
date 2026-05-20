import pytest
from fastapi import BackgroundTasks, HTTPException

from app.api import content, lessons, voice, whatsapp
from app.core.config import settings
from app.core import security
from app.models.schemas import (
    CourseGenerateRequest,
    LessonProgressUpdate,
    VoiceSynthesizeRequest,
    WhatsAppMessagePayload,
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

    def eq(self, column, value):
        self.calls.append(("eq", column, value))
        return self

    def single(self):
        self.calls.append(("single",))
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


async def test_update_progress_rejects_child_not_owned_by_current_user(monkeypatch):
    monkeypatch.setattr(
        lessons,
        "get_supabase",
        lambda: FakeSupabase({"children": [None]}),
    )
    req = LessonProgressUpdate(
        child_id="child-2",
        step_index=0,
        response={"answer": "A"},
        correct=True,
    )

    with pytest.raises(HTTPException) as exc:
        await lessons.update_progress("lesson-1", req, current_user_id="parent-1")

    assert exc.value.status_code == 404


async def test_child_stats_rejects_child_not_owned_by_current_user(monkeypatch):
    monkeypatch.setattr(
        lessons,
        "get_supabase",
        lambda: FakeSupabase({"children": [None]}),
    )

    with pytest.raises(HTTPException) as exc:
        await lessons.get_child_stats("child-2", current_user_id="parent-1")

    assert exc.value.status_code == 404


async def test_child_stats_returns_404_when_owned_child_disappears(monkeypatch):
    monkeypatch.setattr(
        lessons,
        "get_supabase",
        lambda: FakeSupabase({"children": [[{"id": "child-1"}], None]}),
    )

    with pytest.raises(HTTPException) as exc:
        await lessons.get_child_stats("child-1", current_user_id="parent-1")

    assert exc.value.status_code == 404


async def test_child_achievements_requires_owned_child(monkeypatch):
    monkeypatch.setattr(
        lessons,
        "get_supabase",
        lambda: FakeSupabase(
            {
                "children": [[{"id": "child-1"}]],
                "child_achievements": [[{"id": "achievement-1"}]],
            }
        ),
    )

    assert await lessons.get_child_achievements(
        "child-1",
        current_user_id="parent-1",
    ) == [{"id": "achievement-1"}]


async def test_content_generation_requires_authenticated_user():
    with pytest.raises(HTTPException) as exc:
        await content.generate_course(CourseGenerateRequest(), current_user_id=None)

    assert exc.value.status_code == 401


class OversizedUpload:
    content_type = "audio/webm"
    size = (5 * 1024 * 1024) + 1

    async def read(self, size=-1):
        return b"x"


async def test_transcribe_rejects_oversized_upload_before_reading():
    with pytest.raises(HTTPException) as exc:
        await voice.transcribe(OversizedUpload(), language="en", current_user_id="parent-1")

    assert exc.value.status_code == 413


class UploadTooLargeAfterRead:
    content_type = "audio/webm"
    size = None

    async def read(self, size=-1):
        return b"x" * (voice.MAX_AUDIO_UPLOAD_BYTES + 1)


async def test_transcribe_rejects_upload_that_exceeds_limit_after_reading():
    with pytest.raises(HTTPException) as exc:
        await voice.transcribe(UploadTooLargeAfterRead(), language="en", current_user_id="parent-1")

    assert exc.value.status_code == 413


async def test_transcribe_rejects_unsupported_language():
    with pytest.raises(HTTPException) as exc:
        await voice.transcribe(UploadTooLargeAfterRead(), language="fr", current_user_id="parent-1")

    assert exc.value.status_code == 400


async def test_synthesize_rejects_too_much_text():
    req = VoiceSynthesizeRequest(text="x" * 2001, language="en")

    with pytest.raises(HTTPException) as exc:
        await voice.synthesize(req, current_user_id="parent-1")

    assert exc.value.status_code == 413


async def test_synthesize_rejects_unsupported_language():
    req = VoiceSynthesizeRequest(text="hello", language="fr")

    with pytest.raises(HTTPException) as exc:
        await voice.synthesize(req, current_user_id="parent-1")

    assert exc.value.status_code == 400


async def test_whatsapp_process_message_requires_internal_secret(monkeypatch):
    monkeypatch.setattr(settings, "backend_internal_secret", "expected-secret")
    payload = WhatsAppMessagePayload(
        from_number="2348012345678",
        profile_id="profile-1",
        message_type="text",
        text="hello",
    )

    with pytest.raises(HTTPException) as exc:
        await whatsapp.process_message(payload, BackgroundTasks(), x_backend_secret="wrong")

    assert exc.value.status_code == 403


async def test_whatsapp_process_message_fails_closed_when_secret_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "backend_internal_secret", "")
    payload = WhatsAppMessagePayload(
        from_number="2348012345678",
        profile_id="profile-1",
        message_type="text",
        text="hello",
    )

    with pytest.raises(HTTPException) as exc:
        await whatsapp.process_message(payload, BackgroundTasks(), x_backend_secret="anything")

    assert exc.value.status_code == 503


async def test_whatsapp_process_message_accepts_matching_internal_secret(monkeypatch):
    monkeypatch.setattr(settings, "backend_internal_secret", "expected-secret")
    payload = WhatsAppMessagePayload(
        from_number="2348012345678",
        profile_id="profile-1",
        message_type="text",
        text="hello",
    )
    tasks = BackgroundTasks()

    assert await whatsapp.process_message(
        payload,
        tasks,
        x_backend_secret="expected-secret",
    ) == {"status": "accepted"}
    assert len(tasks.tasks) == 1


class AuthResponse:
    def __init__(self, user=None, data=None):
        self.user = user
        self.data = data


class User:
    id = "object-user"


class AuthClient:
    def __init__(self, response=None, exc=None):
        self.response = response
        self.exc = exc

    def get_user(self, token):
        if self.exc:
            raise self.exc
        return self.response


class SupabaseClient:
    def __init__(self, auth):
        self.auth = auth


async def test_require_current_user_id_accepts_valid_bearer_token_from_data(monkeypatch):
    monkeypatch.setattr(
        security,
        "get_supabase",
        lambda: SupabaseClient(AuthClient(AuthResponse(data={"id": "user-1"}))),
    )

    assert await security.require_current_user_id("Bearer valid-token") == "user-1"


async def test_require_current_user_id_accepts_valid_bearer_token_from_user_object(monkeypatch):
    monkeypatch.setattr(
        security,
        "get_supabase",
        lambda: SupabaseClient(AuthClient(AuthResponse(user=User()))),
    )

    assert await security.require_current_user_id("Bearer valid-token") == "object-user"


@pytest.mark.parametrize("authorization", [None, "Basic token", "Bearer   "])
async def test_require_current_user_id_rejects_missing_or_malformed_header(authorization):
    with pytest.raises(HTTPException) as exc:
        await security.require_current_user_id(authorization)

    assert exc.value.status_code == 401


async def test_require_current_user_id_rejects_auth_lookup_failure(monkeypatch):
    monkeypatch.setattr(
        security,
        "get_supabase",
        lambda: SupabaseClient(AuthClient(exc=RuntimeError("bad token"))),
    )

    with pytest.raises(HTTPException) as exc:
        await security.require_current_user_id("Bearer bad-token")

    assert exc.value.status_code == 401


async def test_require_current_user_id_rejects_response_without_user_id(monkeypatch):
    monkeypatch.setattr(
        security,
        "get_supabase",
        lambda: SupabaseClient(AuthClient(AuthResponse(data={}))),
    )

    with pytest.raises(HTTPException) as exc:
        await security.require_current_user_id("Bearer bad-token")

    assert exc.value.status_code == 401
