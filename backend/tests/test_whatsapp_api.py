import pytest
from fastapi import BackgroundTasks, HTTPException

from app.api import whatsapp
from app.core.config import settings
from app.models.schemas import WhatsAppMessagePayload


class Request:
    def __init__(self, params):
        self.query_params = params


async def test_verify_webhook_returns_challenge_for_matching_token(monkeypatch):
    monkeypatch.setattr(settings, "whatsapp_verify_token", "verify-me")

    result = await whatsapp.verify_webhook(
        Request(
            {
                "hub.mode": "subscribe",
                "hub.verify_token": "verify-me",
                "hub.challenge": "12345",
            }
        )
    )

    assert result == 12345


async def test_verify_webhook_rejects_invalid_token(monkeypatch):
    monkeypatch.setattr(settings, "whatsapp_verify_token", "verify-me")

    with pytest.raises(HTTPException) as exc:
        await whatsapp.verify_webhook(
            Request(
                {
                    "hub.mode": "subscribe",
                    "hub.verify_token": "wrong",
                    "hub.challenge": "12345",
                }
            )
        )

    assert exc.value.status_code == 403


async def test_process_message_enqueues_background_handler(monkeypatch):
    monkeypatch.setattr(settings, "backend_internal_secret", "expected-secret")
    tasks = BackgroundTasks()
    payload = WhatsAppMessagePayload(
        from_number="+2348012345678",
        profile_id="profile-1",
        message_type="text",
        text="hello",
    )

    assert await whatsapp.process_message(
        payload,
        tasks,
        x_backend_secret="expected-secret",
    ) == {"status": "accepted"}
    assert len(tasks.tasks) == 1
    assert tasks.tasks[0].args == (payload,)
