from fastapi import APIRouter, BackgroundTasks, Request, HTTPException

from app.core.config import settings
from app.models.schemas import WhatsAppMessagePayload
from app.services.whatsapp_service import handle_whatsapp_message

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


@router.post("/process-message", status_code=202)
async def process_message(
    payload: WhatsAppMessagePayload,
    background_tasks: BackgroundTasks,
):
    """Accept a message from the edge function and process asynchronously."""
    background_tasks.add_task(handle_whatsapp_message, payload)
    return {"status": "accepted"}
