from pydantic import BaseModel
from typing import Optional


class BilingualText(BaseModel):
    en: str
    yo: str


class ChildCreate(BaseModel):
    name: str
    age: int
    preferred_language: str = "yo"


class WhatsAppLinkRequest(BaseModel):
    whatsapp_number: str


class WhatsAppVerifyRequest(BaseModel):
    whatsapp_number: str
    code: str


class LessonProgressUpdate(BaseModel):
    child_id: str
    step_index: int
    response: dict
    correct: bool


class VoiceTranscribeRequest(BaseModel):
    language: str = "en"


class VoiceSynthesizeRequest(BaseModel):
    text: str
    language: str = "en"


class ContentGenerateRequest(BaseModel):
    subject: str
    topic: str
    difficulty_level: int = 1
    target_language: str = "en"


class CourseResponse(BaseModel):
    id: str
    title: BilingualText
    description: BilingualText
    subject: str
    difficulty_level: int
    thumbnail_url: str
    is_premium: bool


class LessonResponse(BaseModel):
    id: str
    course_id: str
    order_index: int
    title: BilingualText
    content: dict
    lesson_type: str
    points_reward: int
    estimated_duration_mins: int


class NextLessonResponse(BaseModel):
    lesson_id: str
    course_id: str
    title: BilingualText
    reason: str


class ChildStatsResponse(BaseModel):
    total_points: int
    current_level: int
    lessons_completed: int
    accuracy: float
    streak_days: int


class WhatsAppMessagePayload(BaseModel):
    from_number: str
    message_type: str
    text: Optional[str] = None
    audio_url: Optional[str] = None
