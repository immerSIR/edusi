"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UseTutorAudioReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  play: (text: string, language: string) => Promise<void>;
  stop: () => void;
}

export function useTutorAudio(): UseTutorAudioReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  // Clean up object URLs on unmount
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async (text: string, language: string) => {
      setError(null);
      stop();

      const cacheKey = `${language}:${text}`;
      let objectUrl = cacheRef.current.get(cacheKey);

      if (!objectUrl) {
        setIsLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/voice/synthesize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, language }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(errData.detail || "Failed to generate audio");
          }

          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          cacheRef.current.set(cacheKey, objectUrl);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Audio playback failed");
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
      }

      const audio = new Audio(objectUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setError("Audio playback failed");
        setIsPlaying(false);
        audioRef.current = null;
      };

      try {
        await audio.play();
      } catch {
        setError("Could not play audio. Tap anywhere first.");
        setIsPlaying(false);
      }
    },
    [stop],
  );

  return { isPlaying, isLoading, error, play, stop };
}
