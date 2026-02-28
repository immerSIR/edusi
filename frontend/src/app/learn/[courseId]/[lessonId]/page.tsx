"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  Star,
  CheckCircle,
} from "lucide-react";
import type { Lesson, LessonStep } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

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

  const steps = lesson?.content?.steps || [];
  const step: LessonStep | undefined = steps[currentStep];
  const totalSteps = steps.length;

  const handleComplete = useCallback(async () => {
    setCompleted(true);
    // Save progress
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: children } = await supabase
        .from("children")
        .select("id")
        .eq("parent_id", user.id)
        .limit(1);

      if (children && children.length > 0) {
        await supabase.from("lesson_progress").upsert(
          {
            child_id: children[0].id,
            lesson_id: lessonId,
            status: "completed",
            score,
            points_earned: lesson?.points_reward || 0,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "child_id,lesson_id" }
        );

        // Update total points
        await supabase.rpc("increment_child_points", {
          child_id_param: children[0].id,
          points_param: lesson?.points_reward || 0,
        });
      }
    }
  }, [lessonId, score, lesson?.points_reward]);

  function handleNext() {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      handleComplete();
    }
  }

  function handleQuizAnswer(idx: number) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const correct = step?.options?.[idx]?.correct || false;
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);
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

  return (
    <div className="min-h-screen flex flex-col">
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
                  <div className="w-full max-w-xs h-48 bg-primary/5 rounded-2xl mb-6 flex items-center justify-center">
                    <Volume2 className="w-12 h-12 text-primary/20" />
                  </div>
                )}
                <p className="text-lg font-medium text-text-primary mb-2">
                  {step.text?.en}
                </p>
                <p className="text-base text-primary/70">
                  {step.text?.yo}
                </p>
              </div>
            )}

            {step?.type === "quiz" && (
              <div className="flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  {step.question?.en}
                </h2>
                <p className="text-sm text-primary/70 mb-6">
                  {step.question?.yo}
                </p>
                <div className="space-y-3">
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
                      <button
                        key={idx}
                        onClick={() => handleQuizAnswer(idx)}
                        disabled={selectedAnswer !== null}
                        className={`w-full text-left px-4 py-3 rounded-xl border ${bg} ${border} transition-all`}
                      >
                        <span className="text-sm text-text-primary">
                          {opt.text.en}
                        </span>
                        <span className="block text-xs text-text-secondary">
                          {opt.text.yo}
                        </span>
                      </button>
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
                <p className="text-base text-primary/70 mb-8">
                  {step.prompt?.yo}
                </p>
                <button className="w-20 h-20 rounded-full bg-primary flex items-center justify-center hover:bg-primary-light transition-colors">
                  <Volume2 className="w-8 h-8 text-white" />
                </button>
                <p className="text-xs text-text-secondary mt-3">
                  Tap to speak
                </p>
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
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={step?.type === "quiz" && selectedAnswer === null}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-30 flex items-center justify-center gap-2 mt-4"
        >
          {currentStep === totalSteps - 1 ? "Finish" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </main>
    </div>
  );
}
