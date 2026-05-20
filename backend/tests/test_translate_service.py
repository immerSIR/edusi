from types import SimpleNamespace

from app.core.config import settings
from app.services.translate_service import translate_text


async def test_translate_text_returns_prefixed_input_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "google_translate_api_key", "")

    assert await translate_text("hello", "en", "yo") == "[yo] hello"


async def test_translate_text_posts_to_google_translate_when_configured(monkeypatch):
    captured = {}
    monkeypatch.setattr(settings, "google_translate_api_key", "key-123")

    class Response:
        def json(self):
            return {"data": {"translations": [{"translatedText": "bawo"}]}}

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, params):
            captured["url"] = url
            captured["params"] = params
            return Response()

    monkeypatch.setattr(
        "app.services.translate_service.httpx",
        SimpleNamespace(AsyncClient=lambda: Client()),
    )

    assert await translate_text("hello", "en", "yo") == "bawo"
    assert captured == {
        "url": "https://translation.googleapis.com/language/translate/v2",
        "params": {
            "q": "hello",
            "source": "en",
            "target": "yo",
            "key": "key-123",
            "format": "text",
        },
    }
