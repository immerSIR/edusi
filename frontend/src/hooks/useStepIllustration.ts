"use client";

import { useState, useEffect, useRef } from "react";
import { getBackendAuthHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UseStepIllustrationReturn {
  url: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Lazy-loads an illustration for a lesson step.
 * Calls the backend step-illustration endpoint which caches images in Supabase Storage.
 * Returns a public URL once ready, or null while loading.
 */
export function useStepIllustration(
  lessonId: string | undefined,
  stepIndex: number,
  description: string | undefined
): UseStepIllustrationReturn {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache URLs so navigating back to a step doesn't re-fetch
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!lessonId || !description) return;

    const cacheKey = `${lessonId}_${stepIndex}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setUrl(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setUrl(null);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/content/step-illustration`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getBackendAuthHeaders()),
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            step_index: stepIndex,
            description,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errData.detail || "Failed to load illustration");
        }

        const data = await res.json();
        if (!cancelled) {
          const imageUrl = data.url;
          cacheRef.current.set(cacheKey, imageUrl);
          setUrl(imageUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Illustration failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, stepIndex, description]);

  return { url, loading, error };
}
