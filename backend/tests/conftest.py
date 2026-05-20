import sys
from types import ModuleType


def _install_fake_supabase_module():
    module = ModuleType("supabase")

    class Client:
        pass

    def create_client(url, key):
        return Client()

    module.Client = Client
    module.create_client = create_client
    sys.modules.setdefault("supabase", module)


def _install_fake_service_modules():
    ai = ModuleType("app.services.ai_service")
    illustration = ModuleType("app.services.illustration_service")
    voice = ModuleType("app.services.voice_service")
    whatsapp = ModuleType("app.services.whatsapp_service")

    async def generate_lesson_content(**kwargs):
        return {"title": {"en": kwargs["topic"]}, "steps": []}

    async def generate_course_with_lessons(**kwargs):
        return {
            "course_title": {"en": "Generated"},
            "course_description": {"en": "Generated course"},
            "subject": kwargs["subject"],
            "difficulty_level": 1,
            "min_age": 7,
            "max_age": 10,
            "lessons": [],
        }

    async def generate_illustration(**kwargs):
        return {
            "image_base64": "aW1hZ2U=",
            "mime_type": "image/png",
            "prompt_used": kwargs["description"],
        }

    async def transcribe_audio(audio_bytes, language, content_type=""):
        return {"text": audio_bytes.decode(), "confidence": 1.0, "language": language}

    async def synthesize_speech(text, language):
        return f"{language}:{text}".encode()

    async def send_whatsapp_message(to, text):
        return None

    async def handle_whatsapp_message(payload):
        return None

    ai.generate_lesson_content = generate_lesson_content
    ai.generate_course_with_lessons = generate_course_with_lessons
    illustration.generate_illustration = generate_illustration
    voice.transcribe_audio = transcribe_audio
    voice.synthesize_speech = synthesize_speech
    whatsapp.send_whatsapp_message = send_whatsapp_message
    whatsapp.handle_whatsapp_message = handle_whatsapp_message

    sys.modules.setdefault("app.services.ai_service", ai)
    sys.modules.setdefault("app.services.illustration_service", illustration)
    sys.modules.setdefault("app.services.voice_service", voice)
    sys.modules.setdefault("app.services.whatsapp_service", whatsapp)


_install_fake_supabase_module()
_install_fake_service_modules()
