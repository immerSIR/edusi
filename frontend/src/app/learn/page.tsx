"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BookOpen, Lock, ArrowLeft } from "lucide-react";
import type { Course } from "@/lib/types";
import { motion } from "framer-motion";

export default function LearnPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState<"all" | "english" | "technology">(
    "all"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .order("difficulty_level");
      setCourses(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered =
    filter === "all"
      ? courses
      : courses.filter((c) => c.subject === filter);

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
        <Link href="/dashboard" className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">Courses</h1>
      </header>

      {/* Filter tabs */}
      <div className="px-4 py-3 flex gap-2">
        {(["all", "english", "technology"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
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
      <main className="flex-1 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/learn/${course.id}`}
                className="block bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-24 bg-primary/10 flex items-center justify-center relative">
                  <BookOpen className="w-10 h-10 text-primary/30" />
                  {course.is_premium && (
                    <div className="absolute top-2 right-2 bg-accent rounded-full p-1">
                      <Lock className="w-3 h-3 text-text-primary" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                    {course.title.en}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Level {course.difficulty_level}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No courses yet</p>
          </div>
        )}
      </main>
    </div>
  );
}
