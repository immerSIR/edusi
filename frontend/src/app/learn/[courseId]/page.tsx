"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  PlayCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Course, Lesson, LessonProgress } from "@/lib/types";
import { useChild } from "@/contexts/ChildContext";
import { useSound } from "@/contexts/SoundContext";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes max

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { child } = useChild();
  const { play: playSound } = useSound();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);
  const [genState, setGenState] = useState<
    "idle" | "generating" | "failed"
  >("idle");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const triggerFiredRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  // Poll lessons from DB until they appear
  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollCountRef.current = 0;

    pollRef.current = setInterval(async () => {
      pollCountRef.current++;

      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      if (data && data.length > 0) {
        setLessons(data);
        setGenState("idle");
        playSound("complete");
        stopPolling();
      } else if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        setGenState("failed");
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }, [courseId, playSound, stopPolling]);

  // Trigger the idempotent backend auto-generate endpoint
  const triggerGeneration = useCallback(async () => {
    setGenState("generating");
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/content/courses/${courseId}/auto-generate`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === "exists") {
        // Lessons already exist — just reload them
        const { data: freshLessons } = await supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index");
        if (freshLessons && freshLessons.length > 0) {
          setLessons(freshLessons);
          setGenState("idle");
          return;
        }
      }

      if (data.status === "error") {
        setGenState("failed");
        return;
      }

      // "started" or "generating" — poll until lessons appear
      startPolling();
    } catch (err) {
      console.error("Auto-generate request failed:", err);
      setGenState("failed");
    }
  }, [courseId, startPolling]);

  // Load course + lessons + progress
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index"),
      ]);

      if (cancelled) return;

      setCourse(courseRes.data);
      const loadedLessons = lessonsRes.data || [];
      setLessons(loadedLessons);

      // If no lessons, trigger auto-generation (once per mount)
      if (courseRes.data && loadedLessons.length === 0 && !triggerFiredRef.current) {
        triggerFiredRef.current = true;
        triggerGeneration();
      }

      // Load progress for existing lessons
      if (child && loadedLessons.length > 0) {
        const { data: prog } = await supabase
          .from("lesson_progress")
          .select("*")
          .eq("child_id", child.id)
          .in(
            "lesson_id",
            loadedLessons.map((l: Lesson) => l.id)
          );

        if (!cancelled) {
          const progressMap: Record<string, LessonProgress> = {};
          for (const p of prog || []) {
            progressMap[p.lesson_id] = p;
          }
          setProgress(progressMap);
        }
      }

      if (!cancelled) setLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [courseId, child, triggerGeneration]);

  // Load progress when lessons change (e.g. after generation completes)
  useEffect(() => {
    if (!child || lessons.length === 0) return;

    async function loadProgress() {
      const { data: prog } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("child_id", child!.id)
        .in(
          "lesson_id",
          lessons.map((l) => l.id)
        );

      const progressMap: Record<string, LessonProgress> = {};
      for (const p of prog || []) {
        progressMap[p.lesson_id] = p;
      }
      setProgress(progressMap);
    }

    loadProgress();
  }, [child, lessons]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  function handleRetry() {
    playSound("tap");
    triggerFiredRef.current = false;
    triggerGeneration();
  }

  if (loading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center gap-3">
        <Link href="/learn" onClick={() => playSound("tap")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">{course.title.en}</h1>
          <p className="text-xs text-white/70">{course.title.yo}</p>
        </div>
      </header>

      {/* Description */}
      <div className="px-4 py-4 bg-surface border-b border-primary/10">
        <p className="text-sm text-text-secondary">{course.description.en}</p>
      </div>

      {/* Lessons list */}
      <main className="flex-1 px-4 py-4 pb-24">
        <div className="space-y-2">
          {lessons.map((lesson, i) => {
            const prog = progress[lesson.id];
            const status = prog?.status || "not_started";

            return (
              <Link
                key={lesson.id}
                href={`/learn/${courseId}/${lesson.id}`}
                onClick={() => playSound("tap")}
                className="flex items-center gap-3 bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0">
                  {status === "completed" ? (
                    <CheckCircle className="w-6 h-6 text-success" />
                  ) : status === "in_progress" ? (
                    <PlayCircle className="w-6 h-6 text-accent" />
                  ) : (
                    <Circle className="w-6 h-6 text-text-secondary/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-text-primary">
                    {i + 1}. {lesson.title.en}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {lesson.title.yo} &middot;{" "}
                    {lesson.estimated_duration_mins} min &middot;{" "}
                    {lesson.points_reward} pts
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Generating state */}
        {lessons.length === 0 && genState === "generating" && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-text-primary mb-1">
              Creating your lesson...
            </p>
            <p className="text-xs text-text-secondary">
              Our AI is building a lesson just for you!
            </p>
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"
                  style={{ animationDelay: `${i * 300}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Failed state with retry */}
        {lessons.length === 0 && genState === "failed" && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-6 h-6 text-error/60" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              Lesson generation failed
            </p>
            <p className="text-xs text-text-secondary mb-4">
              Something went wrong. Please try again.
            </p>
            <button
              onClick={handleRetry}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-light transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
