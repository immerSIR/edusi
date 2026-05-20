"use client";

import Link from "next/link";
import { BookOpen, Mic, Gamepad2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: BookOpen,
    title: { en: "Bilingual Lessons", yo: "Eko Ede Meji" },
    desc: {
      en: "Learn in Yoruba and English",
      yo: "Ko ni ede Yoruba ati Geesi",
    },
  },
  {
    icon: Mic,
    title: { en: "Voice Learning", yo: "Eko Ohun" },
    desc: {
      en: "Speak and listen to learn",
      yo: "So ati gboran lati ko",
    },
  },
  {
    icon: Gamepad2,
    title: { en: "Fun Games", yo: "Ere Igbadun" },
    desc: {
      en: "Earn points and badges",
      yo: "Gba ami ati ami-eri",
    },
  },
  {
    icon: MessageCircle,
    title: { en: "WhatsApp", yo: "WhatsApp" },
    desc: {
      en: "Learn on WhatsApp too",
      yo: "Ko lori WhatsApp paapaa",
    },
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Edusi</h1>
        <div className="flex gap-2">
          <Link
            href="/auth/login"
            className="text-sm px-4 py-2 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm px-4 py-2 rounded-full bg-accent text-text-primary font-medium hover:bg-accent/90 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold text-primary mb-2">
            Learn. Play. Grow.
          </h2>
          <p className="text-lg text-text-secondary mb-1">Ko. Se ere. Dagba.</p>
          <p className="text-base text-text-secondary max-w-md mx-auto mb-8">
            English and technology lessons for Nigerian children, delivered in
            Yoruba and English.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-primary text-white px-8 py-3 rounded-full text-lg font-medium hover:bg-primary-light transition-colors"
          >
            Get Started Free
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 pb-12">
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              className="bg-surface rounded-2xl p-4 shadow-sm text-center"
            >
              <f.icon className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-text-primary">
                {f.title.en}
              </h3>
              <p className="text-xs text-text-secondary mt-1">{f.desc.en}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white/70 text-center text-xs py-4">
        &copy; 2026 Edusi. Built for Nigerian children.
      </footer>
    </div>
  );
}
