"use client";

import { Trophy } from "lucide-react";

export default function AchievementsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white px-4 py-3">
        <h1 className="text-lg font-bold">Achievements</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">
        <Trophy className="w-16 h-16 text-accent/40 mb-4" />
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Coming Soon!
        </h2>
        <p className="text-sm text-text-secondary">
          Earn badges and trophies as you learn. Keep studying!
        </p>
        <p className="text-sm text-primary/70 mt-1">
          O n bo laipe! Pa eko re mo!
        </p>
      </main>
    </div>
  );
}
