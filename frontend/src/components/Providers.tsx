"use client";

import { SoundProvider } from "@/contexts/SoundContext";
import { ChildProvider } from "@/contexts/ChildContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SoundProvider>
      <ChildProvider>{children}</ChildProvider>
    </SoundProvider>
  );
}
