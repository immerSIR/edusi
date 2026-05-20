from pathlib import Path


EDGE_FUNCTION = (
    Path(__file__).resolve().parents[2] / "supabase/functions/whatsapp-webhook/index.ts"
)


def test_whatsapp_edge_function_verifies_meta_signature_and_backend_secret():
    source = EDGE_FUNCTION.read_text()

    assert "WHATSAPP_APP_SECRET" in source
    assert "x-hub-signature-256" in source
    assert "crypto.subtle.importKey" in source
    assert "timingSafeEqual" in source
    assert "X-Backend-Secret" in source
