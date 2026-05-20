"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Mic, Square, Lock, ChevronRight, Loader2 } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";

type ButtonState = "idle" | "priming" | "holding" | "locked";

const PRIME_DELAY_MS = 200;
const LOCK_THRESHOLD_PX = 60;
const MAX_SLIDE_PX = 100;

interface VoiceRecordButtonProps {
  isProcessing: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function VoiceRecordButton({
  isProcessing,
  onStartRecording,
  onStopRecording,
  disabled,
}: VoiceRecordButtonProps) {
  const { play: playSound } = useSound();
  const [state, setState] = useState<ButtonState>("idle");

  const pointerStartX = useRef(0);
  const primingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePointerId = useRef<number | null>(null);
  const stateRef = useRef<ButtonState>("idle");

  // Keep ref in sync for use in pointer handlers (avoids stale closures)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Motion value for smooth slide tracking without React re-renders
  const slideX = useMotionValue(0);
  const clampedSlide = useTransform(slideX, [0, MAX_SLIDE_PX], [0, MAX_SLIDE_PX]);
  const lockIconOpacity = useTransform(slideX, [0, LOCK_THRESHOLD_PX], [0.3, 1]);
  const lockIconScale = useTransform(slideX, [LOCK_THRESHOLD_PX - 10, LOCK_THRESHOLD_PX], [1, 1.3]);

  const clearPriming = useCallback(() => {
    if (primingTimer.current) {
      clearTimeout(primingTimer.current);
      primingTimer.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPriming();
      if (stateRef.current === "holding" || stateRef.current === "locked") {
        onStopRecording();
      }
    };
  }, [clearPriming, onStopRecording]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isProcessing || disabled) return;
      if (stateRef.current === "locked") return;
      if (activePointerId.current !== null) return;

      activePointerId.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerStartX.current = e.clientX;
      slideX.set(0);

      setState("priming");

      primingTimer.current = setTimeout(async () => {
        primingTimer.current = null;
        setState("holding");
        playSound("recordStart");
        await onStartRecording();
      }, PRIME_DELAY_MS);
    },
    [isProcessing, disabled, onStartRecording, playSound, slideX]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      if (stateRef.current !== "holding") return;

      const deltaX = Math.max(0, Math.min(MAX_SLIDE_PX, e.clientX - pointerStartX.current));
      slideX.set(deltaX);

      if (deltaX >= LOCK_THRESHOLD_PX) {
        activePointerId.current = null;
        setState("locked");
        playSound("lock");
        slideX.set(0);
      }
    },
    [playSound, slideX]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      activePointerId.current = null;
      slideX.set(0);

      const currentState = stateRef.current;

      if (currentState === "priming") {
        clearPriming();
        setState("idle");
      } else if (currentState === "holding") {
        setState("idle");
        playSound("recordStop");
        onStopRecording();
      }
    },
    [clearPriming, onStopRecording, playSound, slideX]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      if (stateRef.current === "holding") {
        activePointerId.current = null;
        slideX.set(0);
        setState("idle");
        playSound("recordStop");
        onStopRecording();
      } else if (stateRef.current === "priming") {
        activePointerId.current = null;
        clearPriming();
        setState("idle");
      }
    },
    [clearPriming, onStopRecording, playSound, slideX]
  );

  const handleStopClick = useCallback(() => {
    if (stateRef.current !== "locked") return;
    setState("idle");
    playSound("recordStop");
    onStopRecording();
  }, [onStopRecording, playSound]);

  // Keyboard accessibility: Enter/Space starts in locked mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();

      if (isProcessing || disabled) return;

      if (stateRef.current === "idle") {
        setState("locked");
        playSound("recordStart");
        onStartRecording();
      } else if (stateRef.current === "locked") {
        handleStopClick();
      }
    },
    [isProcessing, disabled, onStartRecording, playSound, handleStopClick]
  );

  const isActive = state === "holding" || state === "locked";
  const showTrack = state === "holding";

  const ariaLabel =
    isProcessing
      ? "Processing recording"
      : state === "idle" || state === "priming"
        ? "Hold to record"
        : state === "holding"
          ? "Recording, slide right to lock"
          : "Recording locked, tap to stop";

  return (
    <div className="flex flex-col items-center">
      {/* Button + slide track row */}
      <div
        className="relative flex items-center select-none"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* The button */}
        <motion.div
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          onKeyDown={handleKeyDown}
          onClick={state === "locked" ? handleStopClick : undefined}
          style={showTrack ? { x: clampedSlide } : undefined}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
            isProcessing
              ? "bg-text-secondary opacity-50 cursor-not-allowed"
              : state === "locked"
                ? "bg-error shadow-lg shadow-error/30 cursor-pointer"
                : isActive
                  ? "bg-error animate-pulse scale-110"
                  : state === "priming"
                    ? "bg-primary scale-105"
                    : "bg-primary hover:bg-primary-light cursor-pointer"
          }`}
        >
          {/* Priming ring animation */}
          {state === "priming" && (
            <motion.div
              className="absolute inset-0 rounded-full border-3 border-white/40"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.15, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}

          {/* Icon */}
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : state === "locked" ? (
            <Square className="w-7 h-7 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </motion.div>

        {/* Slide-to-lock track (visible while holding, appears to the right) */}
        <AnimatePresence>
          {showTrack && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              className="absolute left-16 h-12 w-24 rounded-full bg-error/10 flex items-center justify-between px-3 origin-left"
            >
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              >
                <ChevronRight className="w-4 h-4 text-error/50" />
              </motion.div>
              <motion.div style={{ opacity: lockIconOpacity, scale: lockIconScale }}>
                <Lock className="w-4 h-4 text-error" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lock badge (visible when locked, to the right) */}
        <AnimatePresence>
          {state === "locked" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute left-24 w-8 h-8 rounded-full bg-error/15 flex items-center justify-center"
            >
              <Lock className="w-4 h-4 text-error" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Label text */}
      <p className="text-xs text-text-secondary mt-3 text-center h-4">
        {isProcessing ? (
          "Processing..."
        ) : state === "holding" ? (
          <span className="flex items-center gap-1 justify-center text-error/70">
            Slide to lock
            <ChevronRight className="w-3 h-3" />
          </span>
        ) : state === "locked" ? (
          "Tap to stop"
        ) : (
          "Hold to speak"
        )}
      </p>
    </div>
  );
}
