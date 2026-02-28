from fastapi import APIRouter, Request, HTTPException

from app.db.supabase import get_supabase
from app.models.schemas import WhatsAppMessagePayload
from app.services.whatsapp_service import (
    verify_webhook_signature,
    process_incoming_message,
    send_whatsapp_message,
)
from app.core.config import settings

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.get("/webhook")
async def verify_webhook(request: Request):
    """WhatsApp webhook verification (GET challenge)."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        return int(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request):
    """Receive incoming WhatsApp messages."""
    body = await request.body()
    signature = request.headers.get("x-hub-signature-256", "")

    if not verify_webhook_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    data = await request.json()

    # Extract message from WhatsApp Cloud API payload
    try:
        entry = data["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]
        messages = value.get("messages", [])
    except (KeyError, IndexError):
        return {"status": "no messages"}

    for msg in messages:
        from_number = msg["from"]
        msg_type = msg["type"]

        # Check if number is in allowlist
        db = get_supabase()
        profile = (
            db.table("profiles")
            .select("id")
            .eq("whatsapp_number", f"+{from_number}")
            .eq("whatsapp_verified", True)
            .execute()
        )

        if not profile.data:
            await send_whatsapp_message(
                from_number,
                "This number is not registered with Edusi. Please sign up at edusi.app first.",
            )
            continue

        payload = WhatsAppMessagePayload(
            from_number=from_number,
            message_type=msg_type,
            text=msg.get("text", {}).get("body") if msg_type == "text" else None,
            audio_url=msg.get("audio", {}).get("id") if msg_type == "audio" else None,
        )

        response = await process_incoming_message(payload)
        await send_whatsapp_message(from_number, response)

    return {"status": "ok"}
