"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Volume2, Loader2 } from "lucide-react";
import type { UseNarrationQueueReturn } from "@/hooks/useNarrationQueue";

type Lang = "en" | "yo";

interface NarrationBarProps {
  textEn: string;
  textYo: string;
  narration: UseNarrationQueueReturn;
  size?: "sm" | "md";
  disabled?: boolean;
}

const LANG_CONFIG = {
  en: {
    label: "English",
    shortLabel: "EN",
    flag: "🇬🇧",
    activeClass: "bg-blue-600 text-white shadow-sm",
    loadingClass: "bg-blue-50 text-blue-600 border-blue-200",
    idleClass:
      "bg-blue-50/60 text-blue-700/70 border-blue-200/60 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300",
  },
  yo: {
    label: "Yorùbá",
    shortLabel: "YO",
    flag: "🇳🇬",
    activeClass: "bg-green-700 text-white shadow-sm",
    loadingClass: "bg-green-50 text-green-700 border-green-200",
    idleClass:
      "bg-green-50/60 text-green-700/70 border-green-200/60 hover:bg-green-100 hover:text-green-700 hover:border-green-300",
  },
} as const;

function SpeakerButton({
  language,
  text,
  narration,
  size,
  disabled,
}: {
  language: Lang;
  text: string;
  narration: UseNarrationQueueReturn;
  size: "sm" | "md";
  disabled: boolean;
}) {
  const config = LANG_CONFIG[language];

  // Only highlight if THIS specific text is being played
  const isActive =
    narration.activeLang === language &&
    narration.isPlaying &&
    narration.activeText === text;
  const isLoadingThis =
    narration.activeLang === language &&
    narration.isLoading &&
    narration.activeText === text;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled || !text) return;

      if (isActive) {
        narration.stop();
      } else {
        narration.playOne(text, language);
      }
    },
    [disabled, text, isActive, narration, language],
  );

  if (size === "sm") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || !text}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all disabled:opacity-30 ${
          isActive
            ? config.activeClass
            : isLoadingThis
              ? config.loadingClass
              : config.idleClass
        }`}
        aria-label={`Listen in ${config.label}`}
      >
        {isLoadingThis ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
        ) : (
          <motion.div
            animate={isActive ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <Volume2 className="w-2.5 h-2.5" />
          </motion.div>
        )}
        {config.shortLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !text}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-30 ${
        isActive
          ? config.activeClass
          : isLoadingThis
            ? config.loadingClass
            : config.idleClass
      }`}
      aria-label={`Listen in ${config.label}`}
    >
      <span className="text-sm leading-none">{config.flag}</span>
      {isLoadingThis ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <motion.div
          animate={isActive ? { scale: [1, 1.15, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <Volume2 className="w-3.5 h-3.5" />
        </motion.div>
      )}
      {config.label}
    </button>
  );
}

export function NarrationBar({
  textEn,
  textYo,
  narration,
  size = "md",
  disabled = false,
}: NarrationBarProps) {
  if (!textEn && !textYo) return null;

  return (
    <div
      className={`flex items-center ${size === "sm" ? "gap-1.5" : "gap-2 mt-3"}`}
    >
      <SpeakerButton
        language="en"
        text={textEn}
        narration={narration}
        size={size}
        disabled={disabled}
      />
      <SpeakerButton
        language="yo"
        text={textYo}
        narration={narration}
        size={size}
        disabled={disabled}
      />
    </div>
  );
}
