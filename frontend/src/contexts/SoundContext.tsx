"use client";

import { createContext, useContext } from "react";
import {
  useSoundEffects,
  type UseSoundEffectsReturn,
} from "@/hooks/useSoundEffects";

const SoundContext = createContext<UseSoundEffectsReturn | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const sound = useSoundEffects();
  return (
    <SoundContext.Provider value={sound}>{children}</SoundContext.Provider>
  );
}

export function useSound(): UseSoundEffectsReturn {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
