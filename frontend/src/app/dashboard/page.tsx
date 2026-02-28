"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Trophy, Star, BookOpen, Plus } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";
import { useChild } from "@/contexts/ChildContext";

export default function DashboardPage() {
  const router = useRouter();
  const { play: playSound } = useSound();
  const { child: activeChild, children, loading, switchChild } = useChild();

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
      }
    }
    checkAuth();
  }, [router]);

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
      <header className="bg-primary text-white px-4 py-3">
        <h1 className="text-xl font-bold">Edusi</h1>
      </header>

      <main className="flex-1 px-4 py-6 pb-24 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Your Children
        </h2>

        {/* Children list */}
        <div className="space-y-3 mb-6">
          {children.map((child) => {
            const isActive = activeChild?.id === child.id;
            return (
              <button
                key={child.id}
                onClick={() => {
                  playSound("tap");
                  switchChild(child.id);
                  router.push("/learn");
                }}
                className={`w-full text-left bg-surface rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${
                  isActive ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <span className="text-lg font-bold">
                      {child.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary">
                      {child.name}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Age {child.age} &middot; Level {child.current_level}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-accent">
                      <Star className="w-4 h-4" />
                      {child.total_points}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Trophy className="w-4 h-4" />
                      {child.current_level}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className={`grid gap-3 ${children.length < 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {children.length < 2 && (
            <Link
              href="/onboarding"
              onClick={() => playSound("tap")}
              className="bg-surface rounded-2xl p-4 shadow-sm text-center hover:shadow-md transition-shadow"
            >
              <Plus className="w-6 h-6 text-primary mx-auto mb-1" />
              <span className="text-sm text-text-primary">Add Child</span>
            </Link>
          )}
          <Link
            href="/learn"
            onClick={() => playSound("tap")}
            className="bg-primary rounded-2xl p-4 text-center hover:bg-primary-light transition-colors"
          >
            <BookOpen className="w-6 h-6 text-white mx-auto mb-1" />
            <span className="text-sm text-white">Start Learning</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
