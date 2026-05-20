"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  Loader2,
  Star,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Lesson, LessonStep } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useTutorAudio } from "@/hooks/useTutorAudio";
import { useNarrationQueue } from "@/hooks/useNarrationQueue";
import { useSound } from "@/contexts/SoundContext";
import { useChild } from "@/contexts/ChildContext";
import { StepIllustration } from "@/components/StepIllustration";
import { VoiceRecordButton } from "@/components/VoiceRecordButton";
import { NarrationBar } from "@/components/NarrationBar";

function getStepNarrationTexts(step: LessonStep): { en: string; yo: string } | null {
  switch (step.type) {
    case "story":
      return step.text ? { en: step.text.en, yo: step.text.yo } : null;
    case "quiz":
      return step.question ? { en: step.question.en, yo: step.question.yo } : null;
    case "voice":
      return step.prompt ? { en: step.prompt.en, yo: step.prompt.yo } : null;
    case "matching":
    case "practice":
      if (step.text) return { en: step.text.en, yo: step.text.yo };
      if (step.prompt) return { en: step.prompt.en, yo: step.prompt.yo };
      return null;
    default:
      return null;
  }
}

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const { child, refreshChild } = useChild();
  const { play: playSound, unlock: unlockSound } = useSound();
  const {
    isPlaying: tutorPlaying,
    isLoading: tutorLoading,
    play: playTutor,
    stop: stopTutor,
  } = useTutorAudio();
  const narration = useNarrationQueue();
  // Destructure stable method refs for effects (the narration object itself
  // is a new reference on every state change, which would retrigger effects)
  const { playSequence: narrationPlaySeq, prefetch: narrationPrefetch } = narration;

  // Narration: preferred language first, then the other
  const preferredLang = ((child?.preferred_language || "yo") === "en" ? "en" : "yo") as "en" | "yo";
  const otherLang: "en" | "yo" = preferredLang === "en" ? "yo" : "en";

  // Auto-narrate: ON for ages ≤ 10, persisted in localStorage
  const [autoNarrate, setAutoNarrate] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("edusi-auto-narrate");
    if (stored !== null) return stored === "true";
    return (child?.age ?? 6) <= 10;
  });

  // "Tap to Start" splash — ensures user gesture for audio autoplay
  const [lessonStarted, setLessonStarted] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
      setLesson(data);
      setLoading(false);
    }
    load();
  }, [lessonId]);

  const steps = useMemo(() => lesson?.content?.steps || [], [lesson]);
  const step: LessonStep | undefined = steps[currentStep];
  const totalSteps = steps.length;

  // Voice recorder — language comes from the current step
  const voiceLang = step?.language || "en";
  const expectedTextRef = useRef(step?.expected_text);
  useEffect(() => {
    expectedTextRef.current = step?.expected_text;
  }, [step?.expected_text]);

  const [voiceMatched, setVoiceMatched] = useState<boolean | null>(null);

  // Handle transcription result via callback (avoids setState in effect)
  const handleVoiceResult = useCallback(
    (result: { text: string; confidence: number }) => {
      const expected = expectedTextRef.current;
      if (!expected) return;

      const normalize = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
      const spokenWords = normalize(result.text).split(" ").filter(Boolean);
      const expectedWords = normalize(expected).split(" ").filter(Boolean);

      let cursor = 0;
      let inOrder = true;
      for (const word of expectedWords) {
        const idx = spokenWords.indexOf(word, cursor);
        if (idx === -1) { inOrder = false; break; }
        cursor = idx + 1;
      }

      const notTooLong = spokenWords.length <= Math.ceil(expectedWords.length * 1.5);
      const confident = (result.confidence ?? 1) >= 0.75;
      const match = inOrder && notTooLong && confident;

      setVoiceMatched(match);
      if (match) {
        playSound("correct");
        setScore((s) => s + 1);
      } else {
        playSound("incorrect");
      }
    },
    [playSound],
  );

  const {
    isProcessing,
    result: voiceResult,
    error: voiceError,
    startRecording,
    stopRecording,
    reset: resetVoice,
  } = useVoiceRecorder(voiceLang, handleVoiceResult);

  // Auto-narrate: play step text when step changes
  useEffect(() => {
    if (!autoNarrate || !step || !lessonStarted) return;

    const texts = getStepNarrationTexts(step);
    if (!texts) return;

    // Short delay to let step transition animation complete
    const timer = setTimeout(() => {
      narrationPlaySeq([
        { text: texts[preferredLang], language: preferredLang },
        { text: texts[otherLang], language: otherLang },
      ]);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentStep, autoNarrate, lessonStarted, step, narrationPlaySeq, preferredLang, otherLang]);

  // Prefetch next step's audio
  useEffect(() => {
    const nextStep = steps[currentStep + 1];
    if (!nextStep) return;
    const texts = getStepNarrationTexts(nextStep);
    if (texts) {
      narrationPrefetch(texts.en, "en");
      narrationPrefetch(texts.yo, "yo");
    }
  }, [currentStep, steps, narrationPrefetch]);

  const handleComplete = useCallback(async () => {
    playSound("complete");
    setCompleted(true);

    if (child) {
      await supabase.from("lesson_progress").upsert(
        {
          child_id: child.id,
          lesson_id: lessonId,
          status: "completed",
          score,
          points_earned: lesson?.points_reward || 0,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "child_id,lesson_id" }
      );

      await supabase.rpc("increment_child_points", {
        child_id_param: child.id,
        points_param: lesson?.points_reward || 0,
      });

      refreshChild();
    }
  }, [child, lessonId, score, lesson?.points_reward, refreshChild, playSound]);

  function handleNext() {
    stopTutor();
    narration.stop();
    playSound("transition");
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setVoiceMatched(null);
      resetVoice();
    } else {
      handleComplete();
    }
  }

  function handleQuizAnswer(idx: number) {
    if (selectedAnswer !== null) return;
    playSound("tap");
    setSelectedAnswer(idx);
    const correct = step?.options?.[idx]?.correct || false;
    setIsCorrect(correct);
    if (correct) {
      playSound("correct");
      setScore((s) => s + 1);
    } else {
      playSound("incorrect");
    }
  }

  if (loading || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
        </motion.div>
        <h1 className="text-2xl font-bold text-primary mb-2">
          Lesson Complete!
        </h1>
        <p className="text-text-secondary mb-1">Eko ti pari!</p>
        <div className="flex items-center gap-2 text-accent text-lg font-bold mb-6">
          <Star className="w-6 h-6" />
          +{lesson.points_reward} points
        </div>
        <p className="text-sm text-text-secondary mb-8">
          Score: {score}/{totalSteps}
        </p>
        <button
          onClick={() => router.push(`/learn/${courseId}`)}
          className="px-8 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary-light transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  if (!lessonStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-primary/5 to-background">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <Volume2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold text-primary mb-2">
            {lesson.title.en}
          </h1>
          <p className="text-base text-primary/70 mb-1">
            {lesson.title.yo}
          </p>
          <p className="text-xs text-text-secondary mt-4">
            {autoNarrate ? "Audio narration is on" : "Audio narration is off"}
          </p>
        </motion.div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            unlockSound();
            playSound("tap");
            setLessonStarted(true);
          }}
          className="px-10 py-4 bg-accent text-text-primary rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          Start! / Bere!
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" onClick={unlockSound}>
      {/* Header with progress */}
      <header className="bg-primary text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>
        <button
          onClick={() => {
            const next = !autoNarrate;
            setAutoNarrate(next);
            localStorage.setItem("edusi-auto-narrate", String(next));
            if (!next) narration.stop();
          }}
          className="p-1 opacity-80 hover:opacity-100"
          aria-label={autoNarrate ? "Turn off auto-narration" : "Turn on auto-narration"}
        >
          {autoNarrate ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>
        <span className="text-xs font-medium">
          {currentStep + 1}/{totalSteps}
        </span>
      </header>

      {/* Step content */}
      <main className="flex-1 px-4 py-6 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            {step?.type === "story" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                {step.illustration && (
                  <StepIllustration
                    lessonId={lessonId}
                    stepIndex={currentStep}
                    description={step.illustration}
                  />
                )}
                <p className="text-lg font-medium text-text-primary mb-2">
                  {step.text?.en}
                </p>
                <p className="text-base text-primary/70">
                  {step.text?.yo}
                </p>
                <NarrationBar
                  textEn={step.text?.en || ""}
                  textYo={step.text?.yo || ""}
                  narration={narration}
                />
              </div>
            )}

            {step?.type === "quiz" && (
              <div className="flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  {step.question?.en}
                </h2>
                <p className="text-sm text-primary/70 mb-1">
                  {step.question?.yo}
                </p>
                <NarrationBar
                  textEn={step.question?.en || ""}
                  textYo={step.question?.yo || ""}
                  narration={narration}
                />
                <div className="space-y-3 mt-4">
                  {step.options?.map((opt, idx) => {
                    let bg = "bg-surface";
                    let border = "border-primary/10";
                    if (selectedAnswer === idx) {
                      bg = isCorrect ? "bg-success/10" : "bg-error/10";
                      border = isCorrect
                        ? "border-success"
                        : "border-error";
                    } else if (
                      selectedAnswer !== null &&
                      opt.correct
                    ) {
                      bg = "bg-success/10";
                      border = "border-success";
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 rounded-xl border ${bg} ${border} transition-all`}
                      >
                        <button
                          onClick={() => handleQuizAnswer(idx)}
                          disabled={selectedAnswer !== null}
                          className="flex-1 text-left px-4 py-3"
                        >
                          <span className="text-sm text-text-primary">
                            {opt.text.en}
                          </span>
                          <span className="block text-xs text-text-secondary">
                            {opt.text.yo}
                          </span>
                        </button>
                        <div className="pr-2">
                          <NarrationBar
                            textEn={opt.text.en}
                            textYo={opt.text.yo}
                            narration={narration}
                            size="sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedAnswer !== null && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-center mt-4 text-sm font-medium ${
                      isCorrect ? "text-success" : "text-error"
                    }`}
                  >
                    {isCorrect ? "Correct! O dara!" : "Not quite. Ko to."}
                  </motion.p>
                )}
              </div>
            )}

            {step?.type === "voice" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Volume2 className="w-16 h-16 text-primary mb-4" />
                <p className="text-lg font-medium text-text-primary mb-2">
                  {step.prompt?.en}
                </p>
                <p className="text-base text-primary/70 mb-1">
                  {step.prompt?.yo}
                </p>
                <NarrationBar
                  textEn={step.prompt?.en || ""}
                  textYo={step.prompt?.yo || ""}
                  narration={narration}
                  disabled={isProcessing}
                />

                <div className="mb-4" />

                {/* Listen first — tutor plays the expected text */}
                {step.expected_text && (
                  <button
                    onClick={() => {
                      playSound("tap");
                      playTutor(step.expected_text!, step.language || "en");
                    }}
                    disabled={tutorPlaying || tutorLoading}
                    className="flex items-center gap-2 px-6 py-2 mb-6 bg-accent/20 text-primary rounded-full font-medium transition-all hover:bg-accent/30 disabled:opacity-50"
                  >
                    {tutorLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Volume2 className={`w-5 h-5 ${tutorPlaying ? "animate-pulse" : ""}`} />
                    )}
                    {tutorLoading ? "Loading..." : tutorPlaying ? "Playing..." : "Listen first"}
                  </button>
                )}

                {/* Record button — press and hold with slide-to-lock */}
                <VoiceRecordButton
                  isProcessing={isProcessing}
                  onStartRecording={async () => {
                    stopTutor();
                    narration.stop();
                    await startRecording();
                  }}
                  onStopRecording={stopRecording}
                />

                {/* Voice result */}
                {voiceResult && voiceMatched !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 w-full max-w-xs"
                  >
                    <div
                      className={`flex items-center gap-2 justify-center mb-2 ${
                        voiceMatched ? "text-success" : "text-error"
                      }`}
                    >
                      {voiceMatched ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                      <span className="font-medium text-sm">
                        {voiceMatched
                          ? "Great job! O dara!"
                          : "Try again. Tun gbiyanju."}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      You said: &ldquo;{voiceResult.text}&rdquo;
                    </p>
                    {!voiceMatched && voiceResult.confidence < 0.75 && (
                      <p className="text-xs text-error/70 mt-1">
                        Speak more clearly
                      </p>
                    )}
                    {!voiceMatched && (
                      <button
                        onClick={resetVoice}
                        className="mt-3 text-xs text-primary underline"
                      >
                        Try again
                      </button>
                    )}
                  </motion.div>
                )}

                {/* Error */}
                {voiceError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-sm text-error"
                  >
                    {voiceError}
                  </motion.p>
                )}
              </div>
            )}

            {(step?.type === "matching" || step?.type === "practice") && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-lg font-medium text-text-primary mb-2">
                  {step.text?.en || step.prompt?.en}
                </p>
                <p className="text-base text-primary/70">
                  {step.text?.yo || step.prompt?.yo}
                </p>
                <NarrationBar
                  textEn={step.text?.en || step.prompt?.en || ""}
                  textYo={step.text?.yo || step.prompt?.yo || ""}
                  narration={narration}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next button */}
        <button
          onClick={() => { playSound("tap"); handleNext(); }}
          disabled={
            (step?.type === "quiz" && selectedAnswer === null) ||
            (step?.type === "voice" && voiceMatched === null && !voiceError)
          }
          className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-30 flex items-center justify-center gap-2 mt-4"
        >
          {currentStep === totalSteps - 1 ? "Finish" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </main>
    </div>
  );
}
