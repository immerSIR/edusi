import secrets

from fastapi import APIRouter, HTTPException

from app.db.supabase import get_supabase
from app.models.schemas import WhatsAppLinkRequest, WhatsAppVerifyRequest
from app.services.whatsapp_service import send_whatsapp_message

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory store for verification codes (use Redis in production)
_verification_codes: dict[str, str] = {}


@router.post("/whatsapp/link")
async def link_whatsapp(req: WhatsAppLinkRequest):
    """Send a verification code to the WhatsApp number."""
    code = str(secrets.randbelow(900000) + 100000)
    _verification_codes[req.whatsapp_number] = code

    await send_whatsapp_message(
        req.whatsapp_number,
        f"Your Edusi verification code is: {code}\nKoodu ijeri re ni: {code}",
    )

    return {"message": "Verification code sent"}


@router.post("/whatsapp/verify")
async def verify_whatsapp(req: WhatsAppVerifyRequest):
    """Verify the WhatsApp code and add to allowlist."""
    expected = _verification_codes.get(req.whatsapp_number)
    if not expected or expected != req.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    del _verification_codes[req.whatsapp_number]

    db = get_supabase()
    # Update the profile with the verified WhatsApp number
    db.table("profiles").update(
        {"whatsapp_number": req.whatsapp_number, "whatsapp_verified": True}
    ).eq("whatsapp_number", req.whatsapp_number).execute()

    return {"message": "WhatsApp linked successfully"}
