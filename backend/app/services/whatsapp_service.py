"""WhatsApp conversational lesson engine for Edusi.

Implements a state-machine-driven bot that delivers bilingual lessons
(story / quiz / voice steps) over WhatsApp, with full progress and
gamification sync to the same database tables used by the web app.
"""

import logging
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import httpx

from app.core.config import settings
from app.db.supabase import get_supabase
from app.models.schemas import WhatsAppMessagePayload

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shared HTTP client (reused across all WhatsApp API calls)
# ---------------------------------------------------------------------------

_http: httpx.AsyncClient | None = None


def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=30)
    return _http


WA_API = "https://graph.facebook.com/v23.0"

# ---------------------------------------------------------------------------
# Per-turn message limit (safety guard against infinite loops)
# ---------------------------------------------------------------------------

MAX_MESSAGES_PER_TURN = 6
_turn_message_count = 0


def _reset_turn_counter():
    global _turn_message_count
    _turn_message_count = 0


def _check_turn_limit() -> bool:
    """Returns True if we can still send, False if limit reached."""
    global _turn_message_count
    _turn_message_count += 1
    if _turn_message_count > MAX_MESSAGES_PER_TURN:
        print(f"[WA] RATE LIMIT: {_turn_message_count} messages in one turn, stopping")
        return False
    return True


# ---------------------------------------------------------------------------
# WhatsApp messaging helpers
# ---------------------------------------------------------------------------


async def send_text(to: str, text: str) -> None:
    """Send a plain text message."""
    if not _check_turn_limit():
        return
    if not settings.whatsapp_access_token:
        logger.info("[WA DEV] To %s: %s", to, text[:120])
        return

    client = _get_http()
    url = f"{WA_API}/{settings.whatsapp_phone_number_id}/messages"
    resp = await client.post(
        url,
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text},
        },
        headers={"Authorization": f"Bearer {settings.whatsapp_access_token}"},
    )
    print(f"[WA] send_text to {to}: {resp.status_code} {resp.text[:200]}")


# Keep legacy name as alias
send_whatsapp_message = send_text


async def send_buttons(to: str, body: str, buttons: list[dict]) -> None:
    """Send an interactive button message (max 3 buttons, title max 20 chars)."""
    if not _check_turn_limit():
        return
    if not settings.whatsapp_access_token:
        labels = ", ".join(b["title"] for b in buttons)
        logger.info("[WA DEV] To %s: [buttons] %s | %s", to, body[:80], labels)
        return

    client = _get_http()
    url = f"{WA_API}/{settings.whatsapp_phone_number_id}/messages"
    await client.post(
        url,
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": b["id"], "title": b["title"][:20]}}
                        for b in buttons[:3]
                    ]
                },
            },
        },
        headers={"Authorization": f"Bearer {settings.whatsapp_access_token}"},
    )


async def send_list(
    to: str, body: str, button_text: str, sections: list[dict]
) -> None:
    """Send an interactive list message (max 10 rows total)."""
    if not _check_turn_limit():
        return
    if not settings.whatsapp_access_token:
        logger.info("[WA DEV] To %s: [list] %s", to, body[:80])
        return

    client = _get_http()
    url = f"{WA_API}/{settings.whatsapp_phone_number_id}/messages"
    resp = await client.post(
        url,
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "body": {"text": body},
                "action": {
                    "button": button_text[:20],
                    "sections": sections,
                },
            },
        },
        headers={"Authorization": f"Bearer {settings.whatsapp_access_token}"},
    )
    print(f"[WA] send_list to {to}: {resp.status_code} {resp.text[:200]}")


async def send_audio(to: str, audio_bytes: bytes, mime_type: str = "audio/ogg") -> None:
    """Upload audio to WhatsApp and send it as a voice message."""
    if not _check_turn_limit():
        return
    if not settings.whatsapp_access_token:
        logger.info("[WA DEV] To %s: [audio %d bytes]", to, len(audio_bytes))
        return

    client = _get_http()
    headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}"}

    # Step 1: upload the media
    ext = "ogg" if "ogg" in mime_type else "wav"
    upload_resp = await client.post(
        f"{WA_API}/{settings.whatsapp_phone_number_id}/media",
        headers=headers,
        data={"messaging_product": "whatsapp", "type": mime_type},
        files={"file": (f"audio.{ext}", audio_bytes, mime_type)},
    )
    upload_data = upload_resp.json()
    media_id = upload_data.get("id")
    if not media_id:
        print(f"[WA] audio upload failed: {upload_resp.status_code} {upload_resp.text[:200]}")
        return

    # Step 2: send the audio message
    url = f"{WA_API}/{settings.whatsapp_phone_number_id}/messages"
    resp = await client.post(
        url,
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "audio",
            "audio": {"id": media_id},
        },
        headers=headers,
    )
    print(f"[WA] send_audio to {to}: {resp.status_code} {resp.text[:200]}")


async def download_whatsapp_media(media_id: str) -> bytes:
    """Download media from WhatsApp Cloud API (two-step)."""
    client = _get_http()
    headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}"}

    # Step 1: get the download URL
    meta = await client.get(f"{WA_API}/{media_id}", headers=headers)
    download_url = meta.json()["url"]

    # Step 2: download the actual bytes
    resp = await client.get(download_url, headers=headers)
    return resp.content


# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------

SESSION_TIMEOUT_MINUTES = 30


async def get_or_create_session(
    from_number: str, profile_id: str
) -> dict:
    """Load the most recent session for this number, or create a new one."""
    db = get_supabase()

    result = (
        db.table("whatsapp_sessions")
        .select("*")
        .eq("whatsapp_number", f"+{from_number}")
        .order("last_activity", desc=True)
        .limit(1)
        .execute()
    )

    if result.data:
        session = result.data[0]
        last = datetime.fromisoformat(session["last_activity"].replace("Z", "+00:00"))
        age_minutes = (datetime.now(timezone.utc) - last).total_seconds() / 60

        # Update last_activity
        db.table("whatsapp_sessions").update(
            {"last_activity": datetime.now(timezone.utc).isoformat()}
        ).eq("id", session["id"]).execute()

        # Timeout: reset to menu (keep child selection if present)
        if age_minutes > SESSION_TIMEOUT_MINUTES:
            state = session.get("session_state") or {}
            if state.get("child_id"):
                state = {
                    "state": "main_menu",
                    "child_id": state["child_id"],
                    "child_name": state.get("child_name", ""),
                    "preferred_language": state.get("preferred_language", "yo"),
                }
            else:
                state = {"state": "select_child"}
            session["session_state"] = state
            session["_timed_out"] = True

        return session

    # Create new session
    new = (
        db.table("whatsapp_sessions")
        .insert({
            "whatsapp_number": f"+{from_number}",
            "profile_id": profile_id,
            "session_state": {"state": "select_child"},
        })
        .execute()
    )
    session = new.data[0]
    session["_new"] = True
    return session


async def save_session(session_id: str, state: dict) -> None:
    """Persist updated session state."""
    db = get_supabase()
    update: dict = {
        "session_state": state,
        "last_activity": datetime.now(timezone.utc).isoformat(),
    }
    if state.get("child_id"):
        update["child_id"] = state["child_id"]
    if state.get("lesson_id"):
        update["current_lesson_id"] = state["lesson_id"]
    else:
        update["current_lesson_id"] = None

    db.table("whatsapp_sessions").update(update).eq("id", session_id).execute()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _wav_to_ogg(wav_bytes: bytes) -> bytes:
    """Convert WAV audio to OGG/Opus using ffmpeg (WhatsApp requires OGG)."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_f:
        wav_f.write(wav_bytes)
        wav_path = wav_f.name
    ogg_path = wav_path.replace(".wav", ".ogg")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-c:a", "libopus", "-b:a", "64k", ogg_path],
            capture_output=True, check=True, timeout=15,
        )
        return Path(ogg_path).read_bytes()
    finally:
        Path(wav_path).unlink(missing_ok=True)
        Path(ogg_path).unlink(missing_ok=True)


def _bil(text_obj: dict | None, lang: str) -> str:
    """Get text in preferred language, falling back to the other."""
    if not text_obj:
        return ""
    return text_obj.get(lang) or text_obj.get("en") or text_obj.get("yo") or ""


def _bil_both(text_obj: dict | None, lang: str) -> str:
    """Get text in both languages, preferred first."""
    if not text_obj:
        return ""
    other = "yo" if lang == "en" else "en"
    primary = text_obj.get(lang, "")
    secondary = text_obj.get(other, "")
    if primary and secondary and primary != secondary:
        return f"{primary}\n---\n{secondary}"
    return primary or secondary


def _lesson_display_lang(state: dict) -> str:
    """Determine which language to show first in lesson steps.

    For English courses the target language is English, so English text
    should appear first with Yoruba as helper — regardless of the child's
    preferred UI language.  For other courses, use the child's preferred
    language.
    """
    subject = state.get("selected_subject", "english")
    if subject == "english":
        return "en"
    return state.get("preferred_language", "yo")


def _child_age(dob_str: str) -> int:
    """Calculate age from date_of_birth string."""
    dob = datetime.fromisoformat(dob_str).date()
    today = datetime.now(timezone.utc).date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _calculate_level(points: int) -> int:
    if points < 50:
        return 1
    if points < 150:
        return 2
    if points < 300:
        return 3
    if points < 500:
        return 4
    return 5


def score_pronunciation(transcribed: str, expected: str) -> float:
    """Score pronunciation using ordered word matching, 0.0 to 1.0.

    Checks that expected words appear **in order** in the transcription
    (longest common subsequence), and penalises extra words.  This matches
    the web app's sequential matching approach.
    """
    t_words = transcribed.lower().split()
    e_words = expected.lower().split()
    if not e_words:
        return 1.0
    if not t_words:
        return 0.0

    # Longest common subsequence length (order-preserving match)
    n, m = len(t_words), len(e_words)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if t_words[i - 1] == e_words[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    matched = dp[n][m]

    # Penalise extra words (transcript much longer than expected)
    extra_penalty = max(0, len(t_words) - len(e_words)) * 0.1
    score = (matched / len(e_words)) - extra_penalty
    return max(0.0, min(1.0, score))


# ---------------------------------------------------------------------------
# Top-level message handler (called as BackgroundTask)
# ---------------------------------------------------------------------------

GLOBAL_CMDS = {
    "menu", "home", "akojopo", "start",
}
HELP_CMDS = {"help", "iranlowo", "?"}
STOP_CMDS = {"stop", "bye", "o dabo", "quit"}


async def handle_whatsapp_message(payload: WhatsAppMessagePayload) -> None:
    """Main dispatcher — called as a FastAPI BackgroundTask."""
    phone = payload.from_number
    print(f"[WA] Processing message from {phone}: type={payload.message_type}, text={payload.text!r}")
    _reset_turn_counter()
    try:
        session = await get_or_create_session(phone, payload.profile_id)
        state = session.get("session_state") or {"state": "select_child"}

        # Welcome back on timeout
        if session.get("_timed_out"):
            await send_text(phone, "Welcome back! / Kaabo pada!")

        # Global commands (text only)
        if payload.message_type == "text" and payload.text:
            cmd = payload.text.strip().lower()
            if cmd in STOP_CMDS:
                await send_text(phone, "Goodbye! See you next time!\nO dabo! A o tun ri!")
                state = {"state": "select_child"}
                await save_session(session["id"], state)
                return
            if cmd in HELP_CMDS:
                await _send_help(phone, state)
                return
            if cmd in GLOBAL_CMDS:
                if state.get("child_id"):
                    state["state"] = "main_menu"
                else:
                    state["state"] = "select_child"
                # Fall through to state dispatch

        # Dispatch to state handler
        handler = STATE_HANDLERS.get(state.get("state", "select_child"), handle_select_child)
        new_state = await handler(phone, payload, session, state)
        await save_session(session["id"], new_state)

    except Exception as exc:
        print(f"[WA] ERROR processing message from {phone}: {exc}")
        logger.exception("Error processing WhatsApp message from %s", phone)
        try:
            await send_text(
                phone,
                "Something went wrong. Send 'menu' to start over.\n"
                "Nkan kan sele. Fi 'menu' ranse lati tun bere.",
            )
        except Exception:
            logger.exception("Failed to send error message to %s", phone)


async def _send_help(phone: str, state: dict) -> None:
    lang = state.get("preferred_language", "yo")
    if lang == "yo":
        await send_text(
            phone,
            "Iranlowo Edusi:\n"
            "- Fi 'menu' ranse lati pada si akojopo\n"
            "- Fi 'stop' ranse lati pari\n"
            "- Fi 'help' ranse lati ri iranlowo yi\n\n"
            "Edusi Help:\n"
            "- Send 'menu' to go back to main menu\n"
            "- Send 'stop' to end\n"
            "- Send 'help' to see this message",
        )
    else:
        await send_text(
            phone,
            "Edusi Help:\n"
            "- Send 'menu' to go back to main menu\n"
            "- Send 'stop' to end\n"
            "- Send 'help' to see this message\n\n"
            "Iranlowo Edusi:\n"
            "- Fi 'menu' ranse lati pada si akojopo\n"
            "- Fi 'stop' ranse lati pari\n"
            "- Fi 'help' ranse lati ri iranlowo yi",
        )


# ---------------------------------------------------------------------------
# State handlers — each returns updated state dict
# ---------------------------------------------------------------------------


async def handle_select_child(
    phone: str, payload: WhatsAppMessagePayload, session: dict, state: dict
) -> dict:
    """Ask which child is learning, or auto-select if only one."""
    db = get_supabase()
    profile_id = session.get("profile_id") or payload.profile_id

    children = (
        db.table("children")
        .select("id, name, current_level, total_points, preferred_language, date_of_birth")
        .eq("parent_id", profile_id)
        .execute()
    ).data or []

    if not children:
        await send_text(
            phone,
            "No children registered yet. Please add a child at edusi.app first.\n"
            "Ko si omo ti a forukosile. Jowo fi omo kun ni edusi.app.",
        )
        return state

    # Auto-select single child
    if len(children) == 1:
        child = children[0]
        new_state = {
            "state": "main_menu",
            "child_id": child["id"],
            "child_name": child["name"],
            "preferred_language": child.get("preferred_language", "yo"),
        }
        await send_text(
            phone,
            f"Welcome to Edusi! Learning with {child['name']}.\n"
            f"Kaabo si Edusi! A n ko eko pelu {child['name']}.",
        )
        return await _show_main_menu(phone, new_state)

    # Multiple children — let parent choose
    if payload.interactive_reply_id and payload.interactive_reply_id.startswith("child_"):
        child_map = state.get("child_list_map", {})
        child_id = child_map.get(payload.interactive_reply_id)
        if child_id:
            child = next((c for c in children if c["id"] == child_id), None)
            if child:
                new_state = {
                    "state": "main_menu",
                    "child_id": child["id"],
                    "child_name": child["name"],
                    "preferred_language": child.get("preferred_language", "yo"),
                }
                await send_text(
                    phone,
                    f"Learning with {child['name']}!\nA n ko eko pelu {child['name']}!",
                )
                return await _show_main_menu(phone, new_state)

    # Send child selection list
    child_list_map = {}
    rows = []
    for i, child in enumerate(children):
        rid = f"child_{i}"
        child_list_map[rid] = child["id"]
        rows.append({
            "id": rid,
            "title": child["name"][:24],
            "description": f"Level {child['current_level']} | {child['total_points']} pts",
        })

    state["child_list_map"] = child_list_map
    state["state"] = "select_child"

    await send_list(
        phone,
        "Welcome to Edusi! Who is learning today?\nKaabo si Edusi! Tani yoo ko eko loni?",
        "Select / Yan",
        [{"title": "Your children", "rows": rows}],
    )
    return state


async def handle_main_menu(
    phone: str, payload: WhatsAppMessagePayload, session: dict, state: dict
) -> dict:
    """Dispatch menu selections or show the menu."""
    reply_id = payload.interactive_reply_id

    # Handle menu selections
    if reply_id == "start_lesson":
        return await handle_select_subject(phone, payload, session, state)
    if reply_id == "continue_lesson":
        return await _resume_lesson(phone, session, state)
    if reply_id == "view_progress":
        return await handle_view_progress(phone, payload, session, state)
    if reply_id == "switch_child":
        state["state"] = "select_child"
        return await handle_select_child(phone, payload, session, state)

    # No recognized action — just display the menu
    return await _show_main_menu(phone, state)


async def _show_main_menu(phone: str, state: dict) -> dict:
    """Display the main menu (no dispatch). Use this to avoid infinite loops."""
    child_name = state.get("child_name", "")

    db = get_supabase()
    in_progress = (
        db.table("lesson_progress")
        .select("lesson_id")
        .eq("child_id", state.get("child_id", ""))
        .eq("status", "in_progress")
        .limit(1)
        .execute()
    ).data

    rows = []
    rows.append({
        "id": "start_lesson",
        "title": "Start Lesson",
        "description": "Begin a new lesson / Bere eko titun",
    })
    if in_progress:
        rows.append({
            "id": "continue_lesson",
            "title": "Continue",
            "description": "Resume where you left off / Tesiwaju",
        })
    rows.append({
        "id": "view_progress",
        "title": "Progress",
        "description": "See your stats / Wo ilowosi re",
    })
    rows.append({
        "id": "switch_child",
        "title": "Switch Child",
        "description": "Change learner / Yi akeko pada",
    })

    state["state"] = "main_menu"
    body = (
        f"Hi {child_name}! What would you like to do?\n"
        f"Kini o fe se?"
    )
    await send_list(phone, body, "Choose / Yan", [{"title": "Menu", "rows": rows}])
    return state


async def handle_select_subject(
    phone: str, payload: WhatsAppMessagePayload, session: dict, state: dict
) -> dict:
    """Let the child pick a subject."""
    reply_id = payload.interactive_reply_id

    if reply_id == "subject_english":
        state["selected_subject"] = "english"
        return await handle_select_course(phone, payload, session, state)
    if reply_id == "subject_technology":
        state["selected_subject"] = "technology"
        return await handle_select_course(phone, payload, session, state)

    state["state"] = "select_subject"
    await send_buttons(
        phone,
        "Choose a subject:\nYan eko kan:",
        [
            {"id": "subject_english", "title": "English / Gesi"},
            {"id": "subject_technology", "title": "Technology / Ero"},
        ],
    )
    return state


async def handle_select_course(
    phone: str, payload: WhatsAppMessagePayload, session: dict, state: dict
) -> dict:
    """Show age-appropriate unlocked courses for the selected subject."""
    reply_id = payload.interactive_reply_id
    lang = state.get("preferred_language", "yo")

    # Handle course selection from list
    if reply_id and reply_id.startswith("course_"):
        course_map = state.get("course_list_map", {})
        course_id = course_map.get(reply_id)
        if course_id:
            return await _start_course(phone, course_id, session, state)

    subject = state.get("selected_subject", "english")
    child_id = state.get("child_id", "")
    db = get_supabase()

    # Get child age
    child = db.table("children").select("date_of_birth").eq("id", child_id).single().execute()
    age = _child_age(child.data["date_of_birth"]) if child.data else 8

    # Get courses for this subject + age
    courses = (
        db.table("courses")
        .select("id, title, difficulty_level, min_age, max_age")
        .eq("subject", subject)
        .lte("min_age", age)
        .gte("max_age", age)
        .order("difficulty_level")
        .execute()
    ).data or []

    if not courses:
        await send_text(phone, "No courses available for this subject yet.\nKo si eko ti o wa fun eko yi.")
        state["state"] = "main_menu"
        return await _show_main_menu(phone, state)

    # Get completed lessons per course to determine unlock status
    all_progress = (
        db.table("lesson_progress")
        .select("lesson_id, status")
        .eq("child_id", child_id)
        .eq("status", "completed")
        .execute()
    ).data or []
    completed_lesson_ids = {p["lesson_id"] for p in all_progress}

    # Get lesson counts per course
    all_lessons = (
        db.table("lessons")
        .select("id, course_id")
        .execute()
    ).data or []
    lessons_by_course: dict[str, list[str]] = {}
    for les in all_lessons:
        lessons_by_course.setdefault(les["course_id"], []).append(les["id"])

    # Determine unlocked courses (sequential by difficulty)
    unlocked_courses = []
    prev_difficulty_complete = True
    prev_difficulty = 0

    for course in courses:
        diff = course["difficulty_level"]
        if diff > prev_difficulty and not prev_difficulty_complete:
            break  # Can't access this difficulty or higher
        course_lessons = lessons_by_course.get(course["id"], [])
        completed = sum(1 for lid in course_lessons if lid in completed_lesson_ids)
        total = len(course_lessons)
        course["_completed"] = completed
        course["_total"] = total
        unlocked_courses.append(course)
        if diff > prev_difficulty:
            prev_difficulty_complete = True
            prev_difficulty = diff
        if total > 0 and completed < total:
            prev_difficulty_complete = False

    if not unlocked_courses:
        await send_text(phone, "All courses are locked. Complete easier courses first!")
        state["state"] = "main_menu"
        return await _show_main_menu(phone, state)

    # Build list
    course_list_map = {}
    rows = []
    for i, course in enumerate(unlocked_courses[:10]):
        rid = f"course_{i}"
        course_list_map[rid] = course["id"]
        title = _bil(course["title"], lang)[:24]
        desc = f"{course['_completed']}/{course['_total']} lessons done"
        rows.append({"id": rid, "title": title, "description": desc})

    state["course_list_map"] = course_list_map
    state["state"] = "select_course"

    await send_list(
        phone,
        "Choose a course:\nYan eto eko kan:",
        "Select / Yan",
        [{"title": "Courses", "rows": rows}],
    )
    return state


async def _start_course(phone: str, course_id: str, session: dict, state: dict) -> dict:
    """Find the first uncompleted lesson in a course and start it."""
    db = get_supabase()
    child_id = state.get("child_id", "")
    lang = state.get("preferred_language", "yo")

    lessons = (
        db.table("lessons")
        .select("id, title, content, points_reward, order_index")
        .eq("course_id", course_id)
        .order("order_index")
        .execute()
    ).data or []

    if not lessons:
        await send_text(phone, "This course has no lessons yet.\nEko yi ko ni eko kankan.")
        state["state"] = "main_menu"
        return state

    # Find first uncompleted lesson
    completed = (
        db.table("lesson_progress")
        .select("lesson_id")
        .eq("child_id", child_id)
        .eq("status", "completed")
        .execute()
    ).data or []
    completed_ids = {p["lesson_id"] for p in completed}

    lesson = None
    for les in lessons:
        if les["id"] not in completed_ids:
            lesson = les
            break

    if not lesson:
        await send_text(phone, "You've completed all lessons in this course!\nO ti pari gbogbo eko ninu eto yi!")
        state["state"] = "main_menu"
        return state

    return await _start_lesson(phone, lesson, course_id, session, state)


async def _start_lesson(
    phone: str, lesson: dict, course_id: str, session: dict, state: dict
) -> dict:
    """Begin a lesson: create progress record and present first step."""
    db = get_supabase()
    child_id = state.get("child_id", "")
    steps = lesson.get("content", {}).get("steps", [])

    if not steps:
        await send_text(phone, "This lesson has no content yet.")
        state["state"] = "main_menu"
        return state

    # Upsert lesson progress
    db.table("lesson_progress").upsert(
        {
            "child_id": child_id,
            "lesson_id": lesson["id"],
            "status": "in_progress",
            "score": 0,
            "responses": {},
            "attempts": 1,
        },
        on_conflict="child_id,lesson_id",
    ).execute()

    title_en = lesson.get("title", {}).get("en", "")
    title_yo = lesson.get("title", {}).get("yo", "")
    await send_text(
        phone,
        f"Starting: {title_en}\n{len(steps)} steps\n\n"
        f"Bere: {title_yo}\n\n"
        f"Type 'menu' anytime to go back\n"
        f"Fi 'menu' ranse lati pada",
    )

    state.update({
        "state": "lesson_active",
        "lesson_id": lesson["id"],
        "course_id": course_id,
        "step_index": 0,
        "total_steps": len(steps),
        "correct_count": 0,
        "total_scored": 0,
        "points_reward": lesson.get("points_reward", 10),
        "_steps": steps,  # transient, not persisted (re-fetched on resume)
    })

    return await _present_step(phone, state)


async def _resume_lesson(phone: str, session: dict, state: dict) -> dict:
    """Resume an in-progress lesson."""
    db = get_supabase()
    child_id = state.get("child_id", "")

    progress = (
        db.table("lesson_progress")
        .select("*")
        .eq("child_id", child_id)
        .eq("status", "in_progress")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    ).data

    if not progress:
        await send_text(phone, "No lesson in progress.\nKo si eko ti o n lo.")
        state["state"] = "main_menu"
        return state

    prog = progress[0]
    lesson = (
        db.table("lessons")
        .select("id, title, content, points_reward, course_id")
        .eq("id", prog["lesson_id"])
        .single()
        .execute()
    ).data

    if not lesson:
        state["state"] = "main_menu"
        return state

    steps = lesson.get("content", {}).get("steps", [])
    responses = prog.get("responses", {})
    # Resume at the step after the last answered one
    step_index = 0
    for i in range(len(steps)):
        if str(i) in responses:
            step_index = i + 1
    step_index = min(step_index, len(steps) - 1)

    # Look up course subject so display language is correct
    course = db.table("courses").select("subject").eq(
        "id", lesson["course_id"]
    ).single().execute()
    subject = course.data["subject"] if course.data else "english"

    title_en = lesson.get("title", {}).get("en", "")
    title_yo = lesson.get("title", {}).get("yo", "")
    await send_text(phone, f"Resuming: {title_en} (step {step_index + 1}/{len(steps)})")

    state.update({
        "state": "lesson_active",
        "lesson_id": lesson["id"],
        "course_id": lesson["course_id"],
        "selected_subject": subject,
        "step_index": step_index,
        "total_steps": len(steps),
        "correct_count": prog.get("score", 0),
        "total_scored": len(responses),
        "points_reward": lesson.get("points_reward", 10),
        "_steps": steps,
    })

    return await _present_step(phone, state)


# ---------------------------------------------------------------------------
# Lesson step presentation & response handling
# ---------------------------------------------------------------------------


async def _get_steps(state: dict) -> list[dict]:
    """Get lesson steps from transient state or re-fetch from DB."""
    steps = state.get("_steps")
    if steps:
        return steps
    db = get_supabase()
    lesson = (
        db.table("lessons")
        .select("content")
        .eq("id", state.get("lesson_id", ""))
        .single()
        .execute()
    ).data
    if not lesson:
        return []
    steps = lesson.get("content", {}).get("steps", [])
    state["_steps"] = steps
    return steps


async def _present_step(phone: str, state: dict) -> dict:
    """Present the current step to the user."""
    steps = await _get_steps(state)
    idx = state.get("step_index", 0)

    if idx >= len(steps):
        return await _complete_lesson(phone, state)

    step = steps[idx]
    step_type = step.get("type", "story")
    lang = _lesson_display_lang(state)
    step_num = idx + 1
    total = state.get("total_steps", len(steps))

    if step_type == "story":
        return await _present_story(phone, step, lang, step_num, total, state)
    elif step_type == "quiz":
        return await _present_quiz(phone, step, lang, step_num, total, state)
    elif step_type == "voice":
        return await _present_voice(phone, step, lang, step_num, total, state)
    else:
        # Unknown step type — skip
        state["step_index"] = idx + 1
        return await _present_step(phone, state)


async def _present_story(
    phone: str, step: dict, lang: str, step_num: int, total: int, state: dict
) -> dict:
    text = _bil_both(step.get("text"), lang)
    msg = f"Step {step_num}/{total}\n\n{text}"
    await send_text(phone, msg)
    await send_buttons(phone, "Ready for the next step?", [
        {"id": "continue", "title": "Next / Tesiwaju"},
        {"id": "go_menu", "title": "Menu / Akojopo"},
    ])
    return state


async def _present_quiz(
    phone: str, step: dict, lang: str, step_num: int, total: int, state: dict
) -> dict:
    question = _bil_both(step.get("question"), lang)
    options = step.get("options", [])

    buttons = []
    options_map = {}
    correct_idx = 0
    for i, opt in enumerate(options[:3]):
        rid = f"opt_{i}"
        opt_text = opt.get("text", {})
        # Show both languages in button label (e.g. "Hello / Bawo ni")
        en = opt_text.get("en", "")
        yo = opt_text.get("yo", "")
        if en and yo and en != yo:
            label = f"{en} / {yo}"[:20] if lang == "en" else f"{yo} / {en}"[:20]
        else:
            label = _bil(opt_text, lang)[:20]
        buttons.append({"id": rid, "title": label})
        options_map[rid] = i
        if opt.get("correct"):
            correct_idx = i

    state["quiz_options_map"] = options_map
    state["correct_option_index"] = correct_idx
    state["hint_used"] = False

    body = f"Step {step_num}/{total}\n\n{question}"
    await send_buttons(phone, body, buttons)
    return state


async def _present_voice(
    phone: str, step: dict, lang: str, step_num: int, total: int, state: dict
) -> dict:
    prompt = _bil_both(step.get("prompt"), lang)
    expected = step.get("expected_text", "")
    voice_lang = step.get("language", "en")

    state["expected_text"] = expected
    state["voice_language"] = voice_lang
    state["voice_retries"] = 0

    msg = (
        f"Step {step_num}/{total}\n\n"
        f"{prompt}\n\n"
        f"Listen, then send a voice note saying:\n\"{expected}\"\n\n"
        f"Gbo, lẹhinna fi ohun ranse ti o n so:\n\"{expected}\""
    )
    await send_text(phone, msg)

    # Send pronunciation sample via TTS (convert WAV → OGG for WhatsApp)
    try:
        from app.services.voice_service import synthesize_speech
        wav_bytes = await synthesize_speech(expected, voice_lang)
        ogg_bytes = _wav_to_ogg(wav_bytes)
        await send_audio(phone, ogg_bytes, "audio/ogg")
    except Exception as exc:
        logger.warning("Failed to send pronunciation sample: %s", exc)

    await send_buttons(phone, "Now send a voice note or skip:", [
        {"id": "skip_voice", "title": "Skip / Fo"},
        {"id": "go_menu", "title": "Menu / Akojopo"},
    ])
    return state


async def handle_lesson_active(
    phone: str, payload: WhatsAppMessagePayload, session: dict, state: dict
) -> dict:
    """Handle user responses during an active lesson."""
    steps = await _get_steps(state)
    idx = state.get("step_index", 0)

    if idx >= len(steps):
        return await _complete_lesson(phone, state)

    step = steps[idx]
    step_type = step.get("type", "story")
    reply_id = payload.interactive_reply_id

    # "Menu" button pressed during lesson — go back to main menu
    if reply_id == "go_menu":
        state["state"] = "main_menu"
        return await _show_main_menu(phone, state)

    if step_type == "story":
        return await _handle_story_response(phone, state)

    elif step_type == "quiz":
        return await _handle_quiz_response(phone, payload, step, state)

    elif step_type == "voice":
        return await _handle_voice_response(phone, payload, step, state)

    # Unknown — advance
    state["step_index"] = idx + 1
    return await _present_step(phone, state)


async def _handle_story_response(phone: str, state: dict) -> dict:
    """Any response advances past a story step."""
    state["step_index"] = state.get("step_index", 0) + 1
    return await _present_step(phone, state)


async def _handle_quiz_response(
    phone: str, payload: WhatsAppMessagePayload, step: dict, state: dict
) -> dict:
    lang = _lesson_display_lang(state)
    reply_id = payload.interactive_reply_id
    text_input = (payload.text or "").strip().lower()
    options = step.get("options", [])
    options_map = state.get("quiz_options_map", {})
    correct_idx = state.get("correct_option_index", 0)

    selected_idx = None

    # From interactive button
    if reply_id and reply_id in options_map:
        selected_idx = options_map[reply_id]

    # From text fallback (A/B/C or 1/2/3)
    if selected_idx is None and text_input:
        text_map = {"a": 0, "b": 1, "c": 2, "1": 0, "2": 1, "3": 2}
        selected_idx = text_map.get(text_input)

    if selected_idx is None:
        await send_text(phone, "Please select an answer by tapping a button or replying A, B, or C.")
        return state

    is_correct = selected_idx == correct_idx

    if is_correct:
        state["correct_count"] = state.get("correct_count", 0) + 1
        state["total_scored"] = state.get("total_scored", 0) + 1
        await send_text(phone, "Correct! Well done!\nO pe! O se daadaa!")
        await _record_step_response(state, {"selected": selected_idx, "correct": True})
        state["step_index"] = state.get("step_index", 0) + 1
        return await _present_step(phone, state)

    # Wrong answer
    hint_used = state.get("hint_used", False)
    if not hint_used:
        hint = _bil_both(step.get("hint"), lang)
        state["hint_used"] = True
        msg = "Not quite! Here's a hint:\nKo to! Eyi ni itoni:\n\n" + hint if hint else "Try again!\nGbiyanju lekansii!"
        await send_text(phone, msg)
        # Re-present the same quiz
        step_num = state.get("step_index", 0) + 1
        total = state.get("total_steps", 0)
        return await _present_quiz(phone, step, lang, step_num, total, state)

    # Second wrong — reveal and move on
    state["total_scored"] = state.get("total_scored", 0) + 1
    correct_text = _bil(options[correct_idx].get("text", {}), lang) if correct_idx < len(options) else ""
    await send_text(
        phone,
        f"The correct answer was: {correct_text}\nIdahun to to ni: {correct_text}\n\nLet's keep going!",
    )
    await _record_step_response(state, {"selected": selected_idx, "correct": False, "hint_used": True})
    state["step_index"] = state.get("step_index", 0) + 1
    return await _present_step(phone, state)


async def _handle_voice_response(
    phone: str, payload: WhatsAppMessagePayload, step: dict, state: dict
) -> dict:
    expected = state.get("expected_text", "")
    voice_lang = state.get("voice_language", "en")

    # Skip button
    if payload.interactive_reply_id == "skip_voice":
        state["total_scored"] = state.get("total_scored", 0) + 1
        await _record_step_response(state, {"skipped": True, "correct": False})
        state["step_index"] = state.get("step_index", 0) + 1
        return await _present_step(phone, state)

    # Audio message
    if payload.message_type == "audio" and payload.audio_media_id:
        try:
            audio_bytes = await download_whatsapp_media(payload.audio_media_id)
            from app.services.voice_service import transcribe_audio
            result = await transcribe_audio(audio_bytes, voice_lang)
            transcribed = result.get("text", "")
            confidence = result.get("confidence", 0)
            score = score_pronunciation(transcribed, expected)

            retries = state.get("voice_retries", 0)

            if score >= 0.7:
                state["correct_count"] = state.get("correct_count", 0) + 1
                state["total_scored"] = state.get("total_scored", 0) + 1
                await send_text(phone, f"You said: \"{transcribed}\"\nWell done! Great pronunciation!\nO se daadaa!")
                await _record_step_response(state, {
                    "transcribed": transcribed, "score": score, "correct": True,
                })
                state["step_index"] = state.get("step_index", 0) + 1
                return await _present_step(phone, state)
            elif score >= 0.4:
                state["total_scored"] = state.get("total_scored", 0) + 1
                await send_text(phone, f"You said: \"{transcribed}\"\nGood try! Let's continue.\nO gbiyanju daadaa!")
                await _record_step_response(state, {
                    "transcribed": transcribed, "score": score, "correct": False,
                })
                state["step_index"] = state.get("step_index", 0) + 1
                return await _present_step(phone, state)
            elif retries < 2:
                state["voice_retries"] = retries + 1
                await send_text(
                    phone,
                    f"You said: \"{transcribed}\"\n"
                    f"Let's try again! Say: \"{expected}\"\n"
                    f"Jeka gbiyanju lekansii! So: \"{expected}\"",
                )
                return state
            else:
                state["total_scored"] = state.get("total_scored", 0) + 1
                await send_text(phone, f"Good effort! The phrase was: \"{expected}\"\nLet's continue!")
                await _record_step_response(state, {
                    "transcribed": transcribed, "score": score, "correct": False,
                })
                state["step_index"] = state.get("step_index", 0) + 1
                return await _present_step(phone, state)

        except Exception as exc:
            logger.warning("Voice processing failed: %s", exc)
            retries = state.get("voice_retries", 0)
            if retries < 2:
                state["voice_retries"] = retries + 1
                await send_text(phone, "Couldn't hear that clearly. Try again or send 'skip'.")
                return state
            state["total_scored"] = state.get("total_scored", 0) + 1
            await _record_step_response(state, {"error": True, "correct": False})
            state["step_index"] = state.get("step_index", 0) + 1
            return await _present_step(phone, state)

    # Text instead of voice
    if payload.message_type == "text" and payload.text:
        score = score_pronunciation(payload.text, expected)
        if score >= 0.7:
            state["correct_count"] = state.get("correct_count", 0) + 1
            state["total_scored"] = state.get("total_scored", 0) + 1
            await send_text(phone, "Correct! Try sending a voice note next time.\nO pe! Gbiyanju lati fi ohun ranse nigba mii.")
            await _record_step_response(state, {"text": payload.text, "score": score, "correct": True})
            state["step_index"] = state.get("step_index", 0) + 1
            return await _present_step(phone, state)
        else:
            await send_text(phone, f"Try sending a voice note saying: \"{expected}\"")
            return state

    await send_text(phone, "Send a voice note or tap Skip.")
    return state


async def _record_step_response(state: dict, response: dict) -> None:
    """Write a step response to lesson_progress."""
    db = get_supabase()
    child_id = state.get("child_id", "")
    lesson_id = state.get("lesson_id", "")
    step_idx = state.get("step_index", 0)

    existing = (
        db.table("lesson_progress")
        .select("id, responses, score")
        .eq("child_id", child_id)
        .eq("lesson_id", lesson_id)
        .limit(1)
        .execute()
    ).data

    if existing:
        prog = existing[0]
        responses = prog.get("responses") or {}
        responses[str(step_idx)] = response
        db.table("lesson_progress").update({
            "responses": responses,
            "score": state.get("correct_count", 0),
        }).eq("id", prog["id"]).execute()


# ---------------------------------------------------------------------------
# Lesson completion & gamification
# ---------------------------------------------------------------------------


async def _complete_lesson(phone: str, state: dict) -> dict:
    """Finish a lesson: save progress, award points, check achievements."""
    db = get_supabase()
    child_id = state.get("child_id", "")
    lesson_id = state.get("lesson_id", "")
    lang = state.get("preferred_language", "yo")
    correct = state.get("correct_count", 0)
    total_scored = state.get("total_scored", 0)
    points_reward = state.get("points_reward", 10)

    pct = round(correct / total_scored * 100) if total_scored > 0 else 100

    # Update lesson_progress to completed
    db.table("lesson_progress").update({
        "status": "completed",
        "score": correct,
        "points_earned": points_reward,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("child_id", child_id).eq("lesson_id", lesson_id).execute()

    # Award points
    db.rpc("increment_child_points", {
        "child_id_param": child_id,
        "points_param": points_reward,
    }).execute()

    # Check for level-up
    child = db.table("children").select("total_points, current_level").eq("id", child_id).single().execute()
    new_total = child.data["total_points"] if child.data else 0
    old_level = child.data["current_level"] if child.data else 1
    new_level = _calculate_level(new_total)
    level_up_msg = ""
    if new_level > old_level:
        db.table("children").update({"current_level": new_level}).eq("id", child_id).execute()
        level_up_msg = f"\nLevel up! You are now Level {new_level}!\nO ti de ipele {new_level}!"

    # Check achievements
    achievement_msgs = await _check_achievements(child_id, lang, correct, total_scored)
    ach_text = "\n".join(achievement_msgs) if achievement_msgs else ""

    msg = (
        f"Lesson Complete! / Eko ti pari!\n\n"
        f"Score: {correct}/{total_scored} ({pct}%)\n"
        f"Points earned: +{points_reward}\n"
        f"Total points: {new_total}"
        f"{level_up_msg}"
    )
    if ach_text:
        msg += f"\n\n{ach_text}"

    await send_text(phone, msg)

    state["state"] = "lesson_complete"
    # Clean up lesson-specific state
    for key in ["lesson_id", "step_index", "total_steps", "correct_count",
                 "total_scored", "points_reward", "quiz_options_map",
                 "correct_option_index", "hint_used", "expected_text",
                 "voice_language", "voice_retries", "_steps"]:
        state.pop(key, None)

    await send_buttons(phone, "What's next?", [
        {"id": "start_lesson", "title": "Next Lesson"},
        {"id": "main_menu_btn", "title": "Menu / Akojopo"},
    ])
    return state


async def handle_lesson_complete(
    phone: str, payload: WhatsAppMessagePayload, session: dict, state: dict
) -> dict:
    reply_id = payload.interactive_reply_id
    text = (payload.text or "").strip().lower()

    if reply_id == "start_lesson" or text in ("next", "tesiwaju"):
        return await handle_select_subject(phone, payload, session, state)
    if reply_id == "main_menu_btn" or text in ("menu", "home"):
        state["state"] = "main_menu"
        return await _show_main_menu(phone, state)

    # Default: go to menu
    state["state"] = "main_menu"
    return await _show_main_menu(phone, state)


async def _check_achievements(
    child_id: str, lang: str, correct: int, total_scored: int
) -> list[str]:
    """Check and award new achievements. Return announcement strings."""
    db = get_supabase()

    all_ach = db.table("achievements").select("*").execute().data or []
    earned = db.table("child_achievements").select("achievement_id").eq("child_id", child_id).execute().data or []
    earned_ids = {a["achievement_id"] for a in earned}

    child = db.table("children").select("total_points").eq("id", child_id).single().execute()
    total_points = child.data["total_points"] if child.data else 0

    completed_count = len(
        (db.table("lesson_progress")
         .select("id")
         .eq("child_id", child_id)
         .eq("status", "completed")
         .execute()).data or []
    )

    is_perfect = total_scored > 0 and correct == total_scored

    msgs = []
    for ach in all_ach:
        if ach["id"] in earned_ids:
            continue
        criteria = ach.get("criteria", {})
        earned_it = False

        if criteria.get("type") == "lessons_completed":
            earned_it = completed_count >= criteria.get("count", 999)
        elif criteria.get("type") == "points_earned":
            earned_it = total_points >= criteria.get("count", 999)
        elif criteria.get("type") == "perfect_lesson":
            earned_it = is_perfect

        if earned_it:
            db.table("child_achievements").insert({
                "child_id": child_id,
                "achievement_id": ach["id"],
            }).execute()
            name = _bil(ach.get("name", {}), lang)
            msgs.append(f"Achievement unlocked: {name}!")

    return msgs


async def handle_view_progress(
    phone: str, payload: WhatsAppMessagePayload, session: dict, state: dict
) -> dict:
    """Show the child's stats."""
    db = get_supabase()
    child_id = state.get("child_id", "")
    child_name = state.get("child_name", "")

    child = db.table("children").select("total_points, current_level").eq("id", child_id).single().execute()
    if not child.data:
        await send_text(phone, "Could not load stats.")
        state["state"] = "main_menu"
        return state

    # Get score and scored-step count per completed lesson for accurate %
    completed_raw = db.table("lesson_progress").select(
        "score, lesson_id"
    ).eq("child_id", child_id).eq("status", "completed").execute()
    completed = completed_raw.data or []
    lessons_done = len(completed)

    # Compute accuracy by looking up scored steps per lesson
    total_correct = 0
    total_scored = 0
    if completed:
        lesson_ids = [p["lesson_id"] for p in completed]
        lessons_data = db.table("lessons").select("id, content").in_(
            "id", lesson_ids
        ).execute()
        scored_map: dict[str, int] = {}
        for lesson in (lessons_data.data or []):
            steps = (lesson.get("content") or {}).get("steps", [])
            scored_map[lesson["id"]] = sum(
                1 for s in steps if s.get("type") in ("quiz", "voice")
            )
        for p in completed:
            total_correct += p.get("score", 0)
            total_scored += scored_map.get(p["lesson_id"], 0)

    accuracy = round(total_correct / total_scored * 100) if total_scored > 0 else 0

    msg = (
        f"{child_name}'s Progress / Ilowosi {child_name}:\n\n"
        f"Level: {child.data['current_level']}\n"
        f"Total Points: {child.data['total_points']}\n"
        f"Lessons Completed: {lessons_done}\n"
        f"Accuracy: {accuracy}%"
    )
    await send_text(phone, msg)

    state["state"] = "main_menu"
    return await _show_main_menu(phone, state)


# ---------------------------------------------------------------------------
# State dispatch table
# ---------------------------------------------------------------------------

STATE_HANDLERS = {
    "select_child": handle_select_child,
    "main_menu": handle_main_menu,
    "select_subject": handle_select_subject,
    "select_course": handle_select_course,
    "lesson_active": handle_lesson_active,
    "lesson_complete": handle_lesson_complete,
    "view_progress": handle_view_progress,
}
