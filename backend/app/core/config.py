from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase (env var is NEXT_PUBLIC_SUPABASE_URL, shared with frontend)
    next_public_supabase_url: str = ""
    supabase_service_role_key: str = ""

    @property
    def supabase_url(self) -> str:
        return self.next_public_supabase_url

    # OpenAI
    openai_api_key: str = ""

    # Google
    google_translate_api_key: str = ""
    google_gemini_api_key: str = ""

    # WhatsApp Cloud API
    whatsapp_access_token: str = ""      # Permanent system user token
    whatsapp_phone_number_id: str = ""   # Test/business phone number ID
    whatsapp_verify_token: str = ""      # Custom string you define for webhook verification

    # Server
    cors_origins: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    model_config = {"env_file": ("../.env", ".env"), "extra": "ignore"}


settings = Settings()
