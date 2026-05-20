import pytest
from fastapi import HTTPException

from app.api import auth
from app.models.schemas import WhatsAppLinkRequest, WhatsAppVerifyRequest


class Query:
    def __init__(self):
        self.calls = []

    def update(self, value):
        self.calls.append(("update", value))
        return self

    def eq(self, column, value):
        self.calls.append(("eq", column, value))
        return self

    def execute(self):
        self.calls.append(("execute",))
        return self


class FakeSupabase:
    def __init__(self):
        self.query = Query()

    def table(self, name):
        self.name = name
        return self.query


async def test_link_whatsapp_stores_and_sends_six_digit_code(monkeypatch):
    sent = []
    monkeypatch.setattr(auth.secrets, "randbelow", lambda _: 234567)

    async def fake_send(number, body):
        sent.append((number, body))

    monkeypatch.setattr(auth, "send_whatsapp_message", fake_send)
    auth._verification_codes.clear()

    result = await auth.link_whatsapp(WhatsAppLinkRequest(whatsapp_number="+2348012345678"))

    assert result == {"message": "Verification code sent"}
    assert auth._verification_codes["+2348012345678"] == "334567"
    assert sent == [
        (
            "+2348012345678",
            "Your Edusi verification code is: 334567\nKoodu ijeri re ni: 334567",
        )
    ]


async def test_verify_whatsapp_rejects_missing_or_wrong_codes():
    auth._verification_codes.clear()

    with pytest.raises(HTTPException) as exc:
        await auth.verify_whatsapp(WhatsAppVerifyRequest(whatsapp_number="+1", code="123456"))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid verification code"


async def test_verify_whatsapp_updates_profile_and_clears_code(monkeypatch):
    db = FakeSupabase()
    monkeypatch.setattr(auth, "get_supabase", lambda: db)
    auth._verification_codes.clear()
    auth._verification_codes["+2348012345678"] = "123456"

    result = await auth.verify_whatsapp(
        WhatsAppVerifyRequest(whatsapp_number="+2348012345678", code="123456")
    )

    assert result == {"message": "WhatsApp linked successfully"}
    assert "+2348012345678" not in auth._verification_codes
    assert db.name == "profiles"
    assert db.query.calls == [
        ("update", {"whatsapp_number": "+2348012345678", "whatsapp_verified": True}),
        ("eq", "whatsapp_number", "+2348012345678"),
        ("execute",),
    ]
