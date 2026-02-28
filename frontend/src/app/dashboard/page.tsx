"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Trophy, Star, BookOpen, Plus, LogOut } from "lucide-react";
import type { Child } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", user.id)
        .order("created_at");

      setChildren(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
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
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Edusi</h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Your Children
        </h2>

        {/* Children list */}
        <div className="space-y-3 mb-6">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/learn?child=${child.id}`}
              className="block bg-surface rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
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
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/onboarding"
            className="bg-surface rounded-2xl p-4 shadow-sm text-center hover:shadow-md transition-shadow"
          >
            <Plus className="w-6 h-6 text-primary mx-auto mb-1" />
            <span className="text-sm text-text-primary">Add Child</span>
          </Link>
          <Link
            href="/learn"
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
