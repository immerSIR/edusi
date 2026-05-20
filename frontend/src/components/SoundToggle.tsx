"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";

export function SoundToggle() {
  const { enabled, setEnabled, play } = useSound();

  return (
    <button
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        if (next) play("tap");
      }}
      className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-text-secondary transition-colors"
      aria-label={enabled ? "Mute sounds" : "Unmute sounds"}
    >
      {enabled ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5 text-error/60" />
      )}
      <span className="text-[10px] font-medium">
        {enabled ? "Sound" : "Muted"}
      </span>
    </button>
  );
}
