from pydantic import BaseModel
from typing import Optional


class BilingualText(BaseModel):
    en: str
    yo: str


class ChildCreate(BaseModel):
    name: str
    date_of_birth: str
    preferred_language: str = "yo"
    school_grade: Optional[str] = None
    english_proficiency: Optional[str] = "basic"
    tech_familiarity: Optional[str] = "none"


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
    min_age: int = 3
    max_age: int = 16


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


class IllustrationGenerateRequest(BaseModel):
    description: str
    style: str = "colorful children's book illustration"


class StepIllustrationRequest(BaseModel):
    lesson_id: str
    step_index: int
    description: str


class IllustrationResponse(BaseModel):
    image_base64: str
    mime_type: str
    prompt_used: str


class CourseThumbnailRequest(BaseModel):
    course_id: str
    description: str


class CourseGenerateRequest(BaseModel):
    subject: str = "technology"
    child_age: int = 8
    covered_topics: list[str] = []


class WhatsAppMessagePayload(BaseModel):
    from_number: str
    profile_id: str
    message_type: str  # "text" | "audio" | "interactive"
    text: Optional[str] = None
    audio_media_id: Optional[str] = None
    interactive_type: Optional[str] = None  # "button_reply" | "list_reply"
    interactive_reply_id: Optional[str] = None
    interactive_reply_title: Optional[str] = None
