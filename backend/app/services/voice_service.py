import io
import re
import json
import math
import asyncio
import logging
import warnings

import numpy as np
import scipy.io.wavfile
import scipy.signal
import torch
from openai import AsyncOpenAI
from transformers import (
    pipeline as hf_pipeline,
    VitsModel,
    AutoTokenizer,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

_openai: AsyncOpenAI | None = None

# Yoruba model singletons (loaded on first use)
_yoruba_asr_pipeline = None
_yoruba_tts_model = None
_yoruba_tts_tokenizer = None


def _get_openai() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        _openai = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai


def _get_yoruba_asr():
    """Load LyngualLabs/whisper-small-yoruba ASR pipeline (lazy singleton)."""
    global _yoruba_asr_pipeline
    if _yoruba_asr_pipeline is None:
        logger.info("Loading Yoruba ASR model: LyngualLabs/whisper-small-yoruba")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _yoruba_asr_pipeline = hf_pipeline(
            "automatic-speech-recognition",
            model="LyngualLabs/whisper-small-yoruba",
            device=device,
        )
        logger.info(f"Yoruba ASR loaded on {device}")
    return _yoruba_asr_pipeline


def _get_yoruba_tts():
    """Load facebook/mms-tts-yor VITS TTS model (lazy singleton)."""
    global _yoruba_tts_model, _yoruba_tts_tokenizer
    if _yoruba_tts_model is None:
        logger.info("Loading Yoruba TTS model: facebook/mms-tts-yor")
        _yoruba_tts_model = VitsModel.from_pretrained("facebook/mms-tts-yor")
        _yoruba_tts_tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-yor")
        # Slower pace for child-friendly pedagogy (default 1.0; lower = slower)
        _yoruba_tts_model.config.speaking_rate = 0.8
        if torch.cuda.is_available():
            _yoruba_tts_model = _yoruba_tts_model.to("cuda")
        logger.info("Yoruba TTS loaded (speaking_rate=0.8)")
    return _yoruba_tts_model, _yoruba_tts_tokenizer


def _transcribe_yoruba(audio_bytes: bytes) -> str:
    """Run Yoruba ASR synchronously (called in thread pool)."""
    pipe = _get_yoruba_asr()
    result = pipe(audio_bytes)
    return result["text"]


def _synthesize_yoruba(text: str) -> bytes:
    """Run Yoruba TTS synchronously (called in thread pool)."""
    model, tokenizer = _get_yoruba_tts()
    inputs = tokenizer(text, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = {k: v.to("cuda") for k, v in inputs.items()}

    with torch.no_grad():
        output = model(**inputs).waveform

    waveform = output.squeeze().cpu().numpy()
    sample_rate = model.config.sampling_rate

    # Scale to 16-bit range then normalize loudness to match OpenAI TTS levels
    pcm = waveform * 32767
    pcm = _rms_normalize(pcm, target_rms=3000.0)
    peak = np.max(np.abs(pcm))
    if peak > 32767:
        pcm = pcm * (32767 / peak)

    buf = io.BytesIO()
    scipy.io.wavfile.write(buf, rate=sample_rate, data=pcm.astype(np.int16))
    buf.seek(0)
    return buf.read()


# ---------------------------------------------------------------------------
# Mixed-language detection for Yoruba text containing English words
# ---------------------------------------------------------------------------

# Yoruba-specific diacritical characters (used for quick pre-check)
_YORUBA_DIACRITICS = re.compile(r"[ẹọṣẸỌṢàáèéìíòóùúÀÁÈÉÌÍÒÓÙÚ]")

# In-memory cache for LLM segmentation results
_segmentation_cache: dict[str, list[tuple[str, str]]] = {}


async def _segment_mixed_text(text: str) -> list[tuple[str, str]]:
    """Use GPT-4o-mini to segment mixed Yoruba/English text by language.

    Returns a list of ``(segment_text, language)`` pairs where language is
    ``"en"`` or ``"yo"``.  Results are cached in memory.  Falls back to
    pure Yoruba on any error so TTS never breaks.
    """
    if text in _segmentation_cache:
        return _segmentation_cache[text]

    # Quick check: if every multi-char word has Yoruba diacritics, skip LLM
    words = [w for w in text.split() if len(w.strip(".,!?;:\"'()-")) > 1]
    if words and all(_YORUBA_DIACRITICS.search(w) for w in words):
        result = [(text, "yo")]
        _segmentation_cache[text] = result
        return result

    try:
        client = _get_openai()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You segment Yoruba sentences that contain English loanwords. "
                        "Split the text into consecutive chunks, labelling each 'yo' (Yoruba) "
                        "or 'en' (English loanwords / technical terms / proper nouns that "
                        "Nigerians say in English). "
                        "IMPORTANT: Only the English word(s) themselves go in 'en' segments. "
                        "All surrounding Yoruba words MUST stay in 'yo' segments. "
                        "Never put Yoruba words inside an 'en' segment.\n\n"
                        "Example input: \"Computer ni ẹrọ tí a lè lò láti ṣe oríṣiríṣi iṣẹ́\"\n"
                        "Example output: {\"segments\": ["
                        "{\"text\": \"Computer\", \"lang\": \"en\"}, "
                        "{\"text\": \"ni ẹrọ tí a lè lò láti ṣe oríṣiríṣi iṣẹ́\", \"lang\": \"yo\"}"
                        "]}\n\n"
                        "Example input: \"Ẹ jẹ́ ká kọ́ nípa keyboard àti mouse\"\n"
                        "Example output: {\"segments\": ["
                        "{\"text\": \"Ẹ jẹ́ ká kọ́ nípa\", \"lang\": \"yo\"}, "
                        "{\"text\": \"keyboard\", \"lang\": \"en\"}, "
                        "{\"text\": \"àti\", \"lang\": \"yo\"}, "
                        "{\"text\": \"mouse\", \"lang\": \"en\"}"
                        "]}\n\n"
                        "When unsure whether a word is English or Yoruba, default to 'yo'. "
                        'Return JSON: {"segments": [{"text": "...", "lang": "en|yo"}, ...]}'
                    ),
                },
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=500,
        )

        raw = response.choices[0].message.content
        logger.debug("LLM segmentation for %r → %s", text, raw)
        data = json.loads(raw)
        segments = [
            (s["text"], s["lang"]) for s in data.get("segments", [])
        ]

        if not segments:
            segments = [(text, "yo")]

        logger.info(
            "Segmented %d chars into %d parts: %s",
            len(text),
            len(segments),
            [(t[:30], l) for t, l in segments],
        )

        _segmentation_cache[text] = segments

        # Evict oldest entries if cache grows too large
        if len(_segmentation_cache) > 500:
            for k in list(_segmentation_cache.keys())[:100]:
                del _segmentation_cache[k]

        return segments
    except Exception as e:
        logger.warning(f"LLM segmentation failed, using pure Yoruba TTS: {e}")
        return [(text, "yo")]


def _rms_normalize(data: np.ndarray, target_rms: float = 3000.0) -> np.ndarray:
    """Normalize audio to a target RMS level so different TTS engines sound equally loud."""
    rms = np.sqrt(np.mean(data ** 2))
    if rms > 0:
        data = data * (target_rms / rms)
    return data


def _concatenate_wav_parts(wav_parts: list[bytes]) -> bytes:
    """Concatenate multiple WAV buffers, resampling and loudness-normalizing."""
    if len(wav_parts) == 1:
        return wav_parts[0]

    decoded: list[tuple[int, np.ndarray]] = []
    max_rate = 0
    for part in wav_parts:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", scipy.io.wavfile.WavFileWarning)
            rate, data = scipy.io.wavfile.read(io.BytesIO(part))
        decoded.append((rate, data.astype(np.float64)))
        max_rate = max(max_rate, rate)

    arrays: list[np.ndarray] = []
    silence = np.zeros(int(max_rate * 0.15))  # 150 ms gap between segments
    for i, (rate, data) in enumerate(decoded):
        if rate != max_rate:
            num_samples = int(len(data) * max_rate / rate)
            data = scipy.signal.resample(data, num_samples)
        # Normalize each segment to the same loudness before joining
        data = _rms_normalize(data)
        arrays.append(data)
        if i < len(decoded) - 1:
            arrays.append(silence)

    combined = np.concatenate(arrays)
    # Final peak clamp to stay within 16-bit range
    peak = np.max(np.abs(combined))
    if peak > 32767:
        combined = combined * (32767 / peak)

    buf = io.BytesIO()
    scipy.io.wavfile.write(buf, rate=max_rate, data=combined.astype(np.int16))
    buf.seek(0)
    return buf.read()


async def _synthesize_english_wav(text: str) -> bytes:
    """Synthesize English text to WAV using OpenAI TTS."""
    client = _get_openai()
    response = await client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice="coral",
        input=text,
        instructions=(
            "You are a warm, patient, and encouraging teacher for young children aged 5-10. "
            "Speak slowly and clearly with a gentle, nurturing tone. "
            "Pause naturally between phrases so the child can follow along. "
            "Be expressive and enthusiastic — celebrate each word like it matters. "
            "Pronounce each word distinctly as if teaching it for the first time."
        ),
        response_format="wav",
    )
    return response.content


def _detect_audio_ext(audio_bytes: bytes, content_type: str = "") -> str:
    """Detect audio file extension from content type or magic bytes."""
    if "webm" in content_type:
        return "webm"
    if "mp4" in content_type or "m4a" in content_type:
        return "mp4"
    if "ogg" in content_type or "opus" in content_type:
        return "ogg"
    if "wav" in content_type:
        return "wav"
    # Fallback: check magic bytes
    if audio_bytes[:4] == b"OggS":
        return "ogg"
    if audio_bytes[:4] == b"RIFF":
        return "wav"
    if audio_bytes[4:8] == b"ftyp":
        return "mp4"
    if audio_bytes[:4] == b"\x1a\x45\xdf\xa3":
        return "webm"
    return "webm"  # safe default — OpenAI accepts webm


async def transcribe_audio(audio_bytes: bytes, language: str, content_type: str = "") -> dict:
    """Transcribe audio to text.

    - Yoruba: LyngualLabs/whisper-small-yoruba (local HF model)
    - English: OpenAI Whisper API
    """
    if language == "yo":
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, _transcribe_yoruba, audio_bytes)
        return {"text": text, "confidence": 1.0, "language": "yo"}

    # English: use GPT-4o-mini-transcribe with logprobs for confidence scoring
    client = _get_openai()
    ext = _detect_audio_ext(audio_bytes, content_type)
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = f"audio.{ext}"

    transcript = await client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=audio_file,
        language="en",
        response_format="json",
        include=["logprobs"],
    )

    # Calculate average confidence from token logprobs
    confidence = 0.0
    if transcript.logprobs:
        probs = [math.exp(t.logprob) for t in transcript.logprobs if t.logprob is not None]
        confidence = sum(probs) / len(probs) if probs else 0.0

    # Strip non-Latin text — the model sometimes hallucinates Arabic/CJK from gibberish
    clean_text = re.sub(r"[^\x00-\x7F]", "", transcript.text).strip()
    if not clean_text:
        return {"text": "", "confidence": 0.0, "language": "en"}

    return {"text": clean_text, "confidence": confidence, "language": "en"}


async def synthesize_speech(text: str, language: str) -> bytes:
    """Synthesize text to speech.

    - Yoruba: facebook/mms-tts-yor (local HF VITS model) with mixed-language
      handling — English words detected in Yoruba text are routed to OpenAI
      TTS and the WAV segments are concatenated.
    - English: OpenAI TTS API
    """
    if language == "yo":
        segments = await _segment_mixed_text(text)

        # All Yoruba — simple path
        if all(lang == "yo" for _, lang in segments):
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _synthesize_yoruba, text)

        # Mixed-language: synthesize each segment with the appropriate engine
        loop = asyncio.get_event_loop()
        wav_parts: list[bytes] = []
        for seg_text, seg_lang in segments:
            if not seg_text.strip():
                continue
            if seg_lang == "yo":
                # VITS model crashes on very short inputs (attention layer
                # needs a minimum sequence length).  Skip trivial segments.
                clean = seg_text.strip(" .,!?;:\"'()-")
                if len(clean) < 2:
                    continue
                try:
                    wav = await loop.run_in_executor(None, _synthesize_yoruba, seg_text)
                except (RuntimeError, Exception) as exc:
                    logger.warning(
                        "VITS failed on segment %r, falling back to English TTS: %s",
                        seg_text, exc,
                    )
                    wav = await _synthesize_english_wav(seg_text)
            else:
                wav = await _synthesize_english_wav(seg_text)
            wav_parts.append(wav)

        if not wav_parts:
            return await loop.run_in_executor(None, _synthesize_yoruba, text)
        if len(wav_parts) == 1:
            return wav_parts[0]

        return _concatenate_wav_parts(wav_parts)

    # English
    return await _synthesize_english_wav(text)
