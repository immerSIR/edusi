"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Trophy, User } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";
import { SoundToggle } from "./SoundToggle";

const tabs = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/learn", icon: BookOpen, label: "Learn" },
  { href: "/achievements", icon: Trophy, label: "Awards" },
  { href: "/profile", icon: User, label: "Profile" },
] as const;

const hiddenPaths = ["/", "/auth", "/onboarding"];

export function BottomNav() {
  const pathname = usePathname();
  const { play } = useSound();

  // Hide on landing, auth, onboarding, and lesson player pages
  const hidden =
    hiddenPaths.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    // Lesson player: /learn/[courseId]/[lessonId]
    /^\/learn\/[^/]+\/[^/]+$/.test(pathname);

  if (hidden) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-primary/10 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto relative">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

          return (
            <Link
              key={href}
              href={href}
              onClick={() => play("tap")}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-primary" : "text-text-secondary"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <SoundToggle />
      </div>
    </nav>
  );
}
