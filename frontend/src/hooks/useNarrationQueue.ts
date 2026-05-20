"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getBackendAuthHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Lang = "en" | "yo";

interface NarrationItem {
  text: string;
  language: Lang;
}

export interface UseNarrationQueueReturn {
  isLoading: boolean;
  isPlaying: boolean;
  activeLang: Lang | null;
  activeText: string | null;
  error: string | null;
  playOne: (text: string, language: Lang) => void;
  playSequence: (items: NarrationItem[], pauseMs?: number) => void;
  stop: () => void;
  prefetch: (text: string, language: Lang) => void;
}

export function useNarrationQueue(): UseNarrationQueueReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang | null>(null);
  const [activeText, setActiveText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const queueRef = useRef<NarrationItem[]>([]);
  const pauseMsRef = useRef(400);
  const abortRef = useRef<AbortController | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    queueRef.current = [];

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
    setActiveLang(null);
    setActiveText(null);
  }, []);

  const fetchAudio = useCallback(
    async (text: string, language: Lang, signal?: AbortSignal): Promise<string | null> => {
      const cacheKey = `${language}:${text}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) return cached;

      try {
        const res = await fetch(`${API_URL}/api/voice/synthesize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getBackendAuthHeaders()),
          },
          body: JSON.stringify({ text, language }),
          signal,
        });

        if (!res.ok) throw new Error("TTS failed");

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        cacheRef.current.set(cacheKey, objectUrl);
        return objectUrl;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return null;
        throw err;
      }
    },
    [],
  );

  const processQueue = useCallback(() => {
    if (stoppedRef.current) return;

    const next = queueRef.current.shift();
    if (!next) {
      setIsPlaying(false);
      setIsLoading(false);
      setActiveLang(null);
      setActiveText(null);
      return;
    }

    setActiveLang(next.language);
    setActiveText(next.text);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const cacheKey = `${next.language}:${next.text}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      // Already cached — play immediately
      setIsLoading(false);
      const audio = new Audio(cached);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        audioRef.current = null;
        if (stoppedRef.current) return;
        if (queueRef.current.length > 0) {
          setIsPlaying(false);
          pauseTimerRef.current = setTimeout(() => {
            pauseTimerRef.current = null;
            processQueue();
          }, pauseMsRef.current);
        } else {
          setIsPlaying(false);
          setActiveLang(null);
          setActiveText(null);
        }
      };
      audio.onerror = () => {
        setError("Playback failed");
        setIsPlaying(false);
        audioRef.current = null;
        processQueue();
      };

      audio.play().catch(() => {
        setError("Could not play audio. Tap anywhere first.");
        setIsPlaying(false);
        processQueue();
      });
    } else {
      // Need to fetch first
      setIsLoading(true);

      fetchAudio(next.text, next.language, controller.signal)
        .then((objectUrl) => {
          if (stoppedRef.current || !objectUrl) return;
          setIsLoading(false);

          const audio = new Audio(objectUrl);
          audioRef.current = audio;

          audio.onplay = () => setIsPlaying(true);
          audio.onended = () => {
            audioRef.current = null;
            if (stoppedRef.current) return;
            if (queueRef.current.length > 0) {
              setIsPlaying(false);
              pauseTimerRef.current = setTimeout(() => {
                pauseTimerRef.current = null;
                processQueue();
              }, pauseMsRef.current);
            } else {
              setIsPlaying(false);
              setActiveLang(null);
              setActiveText(null);
            }
          };
          audio.onerror = () => {
            setError("Playback failed");
            setIsPlaying(false);
            audioRef.current = null;
            processQueue();
          };

          audio.play().catch(() => {
            setError("Could not play audio. Tap anywhere first.");
            setIsPlaying(false);
            processQueue();
          });
        })
        .catch(() => {
          if (stoppedRef.current) return;
          setError("Could not load audio");
          setIsLoading(false);
          processQueue();
        });
    }
  }, [fetchAudio]);

  const playOne = useCallback(
    (text: string, language: Lang) => {
      stop();
      stoppedRef.current = false;
      queueRef.current = [{ text, language }];
      processQueue();
    },
    [stop, processQueue],
  );

  const playSequence = useCallback(
    (items: NarrationItem[], pauseMs = 400) => {
      stop();
      stoppedRef.current = false;
      queueRef.current = [...items];
      pauseMsRef.current = pauseMs;
      processQueue();
    },
    [stop, processQueue],
  );

  const prefetch = useCallback(
    (text: string, language: Lang) => {
      const cacheKey = `${language}:${text}`;
      if (cacheRef.current.has(cacheKey)) return;
      fetchAudio(text, language).catch(() => {
        // Swallow prefetch errors silently
      });
    },
    [fetchAudio],
  );

  return { isLoading, isPlaying, activeLang, activeText, error, playOne, playSequence, stop, prefetch };
}
