"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Lock,
  BookOpen,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import type { Course } from "@/lib/types";
import { getBackendAuthHeaders } from "@/lib/api";
import { motion } from "framer-motion";
import { CourseThumbnail } from "@/components/CourseThumbnail";
import { useChild } from "@/contexts/ChildContext";
import { useSound } from "@/contexts/SoundContext";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const COURSES_PER_PAGE = 6;

type BilingualText = {
  en: string;
  yo: string;
};

const GENERATION_ERROR_MESSAGE: BilingualText = {
  en: "We couldn't generate a new course right now. Please try again.",
  yo: "A ko le ṣẹda ẹkọ tuntun ni bayi. Jọwọ gbiyanju lẹẹkansi.",
};

const DISMISS_LABEL: BilingualText = {
  en: "Dismiss",
  yo: "Pa a mọ́",
};

interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
}

export default function LearnPage() {
  const { child } = useChild();
  const { play: playSound } = useSound();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState<"all" | "english" | "technology">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<BilingualText | null>(
    null
  );
  const [progressMap, setProgressMap] = useState<
    Record<string, CourseProgress>
  >({});

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .order("difficulty_level");
    setCourses(data || []);

    if (child && data) {
      const childId = child.id;

      // Get all lessons grouped by course
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, course_id");

      // Get completed lessons for this child
      const { data: completed } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("child_id", childId)
        .eq("status", "completed");

      const completedSet = new Set(
        (completed || []).map((p) => p.lesson_id)
      );
      const map: Record<string, CourseProgress> = {};

      for (const course of data) {
        const courseLessons = (lessons || []).filter(
          (l) => l.course_id === course.id
        );
        map[course.id] = {
          totalLessons: courseLessons.length,
          completedLessons: courseLessons.filter((l) =>
            completedSet.has(l.id)
          ).length,
        };
      }
      setProgressMap(map);
    }

    setLoading(false);
  }, [child]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Filter by subject, then by child's age range
  const filtered = courses
    .filter((c) => filter === "all" || c.subject === filter)
    .filter((c) => {
      if (!child) return true;
      return c.min_age <= child.age && child.age <= c.max_age;
    });

  // Build a set of locked course IDs based on progression within each subject
  const lockedCourseIds = new Set<string>();
  {
    // Group filtered courses by subject, ordered by difficulty_level
    const bySubject: Record<string, Course[]> = {};
    for (const c of filtered) {
      if (!bySubject[c.subject]) bySubject[c.subject] = [];
      bySubject[c.subject].push(c);
    }
    for (const subject of Object.keys(bySubject)) {
      const sorted = bySubject[subject].sort(
        (a, b) => a.difficulty_level - b.difficulty_level
      );
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const prevProg = progressMap[prev.id];
        const prevCompleted =
          prevProg &&
          prevProg.totalLessons > 0 &&
          prevProg.completedLessons === prevProg.totalLessons;
        if (!prevCompleted) {
          // Lock this course and all subsequent ones in this subject
          for (let j = i; j < sorted.length; j++) {
            lockedCourseIds.add(sorted[j].id);
          }
          break;
        }
      }
    }
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / COURSES_PER_PAGE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedCourses = filtered.slice(
    (safeCurrentPage - 1) * COURSES_PER_PAGE,
    safeCurrentPage * COURSES_PER_PAGE
  );

  // Check if all filtered courses are completed (for "Generate New Course" button)
  const allCompleted =
    filtered.length > 0 &&
    filtered.every((c) => {
      const prog = progressMap[c.id];
      return prog && prog.totalLessons > 0 && prog.completedLessons === prog.totalLessons;
    });

  async function handleGenerateCourse() {
    if (!child || generating) return;
    setGenerating(true);
    setGenerationError(null);
    playSound("tap");

    try {
      const coveredTopics = filtered.map((c) => c.title.en);
      const subject = filter === "all" ? "technology" : filter;

      const res = await fetch(`${BACKEND_URL}/api/content/generate-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getBackendAuthHeaders()),
        },
        body: JSON.stringify({
          subject,
          child_age: child.age,
          covered_topics: coveredTopics,
        }),
      });

      if (!res.ok) throw new Error("Course generation failed");
      playSound("complete");
      await loadData();
    } catch (err) {
      console.error("Failed to generate course:", err);
      setGenerationError(GENERATION_ERROR_MESSAGE);
      playSound("incorrect");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
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
        <h1 className="text-lg font-bold">Courses</h1>
        {child && (
          <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {child.name}, age {child.age}
          </span>
        )}
      </header>

      {/* Filter tabs */}
      <div className="px-4 py-3 flex gap-2">
        {(["all", "english", "technology"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              playSound("tap");
              setFilter(f);
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Course grid */}
      <main className="flex-1 px-4 pb-24">
        <motion.div
          key={`page-${safeCurrentPage}-${filter}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-2 gap-3"
        >
          {paginatedCourses.map((course, i) => {
            const isLocked = lockedCourseIds.has(course.id);
            const prog = progressMap[course.id];
            const isCompleted =
              prog &&
              prog.totalLessons > 0 &&
              prog.completedLessons === prog.totalLessons;

            const cardContent = (
              <>
                <div className="relative">
                  <CourseThumbnail
                    courseId={course.id}
                    description={course.description.en}
                    isCompleted={!!isCompleted}
                  />
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-t-2xl">
                      <div className="bg-white/90 rounded-full p-2">
                        <Lock className="w-5 h-5 text-text-secondary" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                    {course.title.en}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-text-secondary">
                      Level {course.difficulty_level}
                    </p>
                    {prog && prog.totalLessons > 0 && (
                      <p className="text-xs text-primary font-medium">
                        {prog.completedLessons}/{prog.totalLessons}
                      </p>
                    )}
                  </div>
                  {prog && prog.completedLessons > 0 && (
                    <div className="h-1.5 bg-primary/10 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all duration-300"
                        style={{
                          width: `${(prog.completedLessons / prog.totalLessons) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            );

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {isLocked ? (
                  <div
                    className="block bg-surface rounded-2xl overflow-hidden shadow-sm opacity-70 cursor-not-allowed"
                    onClick={() => playSound("incorrect")}
                  >
                    {cardContent}
                  </div>
                ) : (
                  <Link
                    href={`/learn/${course.id}`}
                    onClick={() => playSound("tap")}
                    className="block bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {cardContent}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No courses available for this age group</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => {
                playSound("tap");
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={safeCurrentPage === 1}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface shadow-sm border border-primary/10 disabled:opacity-30 transition-colors hover:bg-primary/5 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => {
                      playSound("tap");
                      setPage(p);
                    }}
                    className={`w-8 h-8 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                      p === safeCurrentPage
                        ? "bg-primary text-white shadow-md scale-110"
                        : "bg-surface text-text-secondary border border-primary/10 hover:bg-primary/5"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => {
                playSound("tap");
                setPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={safeCurrentPage === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface shadow-sm border border-primary/10 disabled:opacity-30 transition-colors hover:bg-primary/5 active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          </div>
        )}

        {/* Course count */}
        {filtered.length > COURSES_PER_PAGE && (
          <p className="text-center text-xs text-text-secondary mt-2">
            Showing {(safeCurrentPage - 1) * COURSES_PER_PAGE + 1}-
            {Math.min(safeCurrentPage * COURSES_PER_PAGE, filtered.length)} of{" "}
            {filtered.length} courses
          </p>
        )}

        {/* Generate New Course button — shown when all visible courses are completed */}
        {allCompleted && child && (
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary mb-3">
              You&apos;ve completed all courses! Ready for more?
            </p>
            <button
              onClick={handleGenerateCourse}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {generating ? "Generating..." : "Generate New Course"}
            </button>
            {generationError && (
              <div
                role="alert"
                className="mt-3 inline-flex max-w-sm items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="flex-1">
                  <p>{generationError.en}</p>
                  <button
                    type="button"
                    onClick={() => setGenerationError(null)}
                    className="mt-1 font-semibold text-red-800 underline-offset-2 hover:underline"
                  >
                    {DISMISS_LABEL.en}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
