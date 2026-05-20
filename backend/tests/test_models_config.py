from app.core.config import Settings
from app.models.schemas import ChildCreate, ContentGenerateRequest, CourseGenerateRequest


def test_settings_maps_public_supabase_url_to_backend_property():
    settings = Settings(next_public_supabase_url="http://supabase.local")

    assert settings.supabase_url == "http://supabase.local"


def test_child_create_defaults_to_yoruba_and_basic_assessment_values():
    child = ChildCreate(name="Ada", date_of_birth="2018-05-20")

    assert child.preferred_language == "yo"
    assert child.english_proficiency == "basic"
    assert child.tech_familiarity == "none"
    assert child.school_grade is None


def test_content_request_defaults_match_child_friendly_lesson_generation():
    req = ContentGenerateRequest(subject="technology", topic="Internet Safety")

    assert req.difficulty_level == 1
    assert req.target_language == "en"
    assert req.min_age == 3
    assert req.max_age == 16


def test_course_generate_defaults_target_technology_for_eight_year_old():
    req = CourseGenerateRequest()

    assert req.subject == "technology"
    assert req.child_age == 8
    assert req.covered_topics == []
