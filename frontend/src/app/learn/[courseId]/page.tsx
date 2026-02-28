"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  PlayCircle,
} from "lucide-react";
import type { Course, Lesson, LessonProgress } from "@/lib/types";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index"),
      ]);

      setCourse(courseRes.data);
      setLessons(lessonsRes.data || []);

      // Load progress for active child (from URL or first child)
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
          const { data: prog } = await supabase
            .from("lesson_progress")
            .select("*")
            .eq("child_id", children[0].id)
            .in(
              "lesson_id",
              (lessonsRes.data || []).map((l: Lesson) => l.id)
            );

          const progressMap: Record<string, LessonProgress> = {};
          for (const p of prog || []) {
            progressMap[p.lesson_id] = p;
          }
          setProgress(progressMap);
        }
      }

      setLoading(false);
    }
    load();
  }, [courseId]);

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
        <Link href="/learn" className="p-1">
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
      <main className="flex-1 px-4 py-4">
        <div className="space-y-2">
          {lessons.map((lesson, i) => {
            const prog = progress[lesson.id];
            const status = prog?.status || "not_started";

            return (
              <Link
                key={lesson.id}
                href={`/learn/${courseId}/${lesson.id}`}
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
      </main>
    </div>
  );
}
