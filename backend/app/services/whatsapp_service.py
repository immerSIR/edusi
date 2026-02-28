import httpx

from app.core.config import settings
from app.models.schemas import WhatsAppMessagePayload


async def send_whatsapp_message(to: str, text: str) -> dict:
    """Send a text message via WhatsApp Cloud API (v23.0)."""
    if not settings.whatsapp_access_token:
        print(f"[WhatsApp] To: {to} | Message: {text}")
        return {"status": "dev_mode"}

    url = f"https://graph.facebook.com/v23.0/{settings.whatsapp_phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        return response.json()


async def process_incoming_message(payload: WhatsAppMessagePayload) -> str:
    """Process an incoming WhatsApp message and return a response."""
    if payload.message_type == "text" and payload.text:
        text = payload.text.lower()

        if text in ("hi", "hello", "bawo ni", "start"):
            return (
                "Welcome to Edusi!\n"
                "Kaabo si Edusi!\n\n"
                "Send 'learn' to start a lesson\n"
                "Send 'progress' to see your progress"
            )
        elif text == "learn":
            return (
                "Starting your next lesson...\n"
                "A n bere eko to tele...\n\n"
                "What is the English word for 'omi'?\n"
                "A) Water\n"
                "B) Fire\n"
                "C) Air\n\n"
                "Reply with A, B, or C"
            )
        elif text == "progress":
            return (
                "Your Progress / Ilowosi re:\n"
                "Lessons completed: 3\n"
                "Points: 150\n"
                "Level: 2"
            )
        else:
            return (
                "I didn't understand that. Try:\n"
                "- 'learn' to start a lesson\n"
                "- 'progress' to check progress\n\n"
                "Mi o ye ohun ti o so. Gbiyanju:\n"
                "- 'learn' lati bere eko\n"
                "- 'progress' lati wo ilowosi"
            )

    return "Send a text message to interact with Edusi."
