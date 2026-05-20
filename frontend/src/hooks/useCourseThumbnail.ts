"use client";

import { useState, useEffect, useRef } from "react";
import { getBackendAuthHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Module-level cache shared across all component instances
const thumbnailCache = new Map<string, string>();

interface UseCourseThumbnailReturn {
  url: string | null;
  loading: boolean;
}

/**
 * Lazy-loads a thumbnail for a course card.
 * Uses a shared in-memory cache + backend Supabase Storage cache.
 */
export function useCourseThumbnail(
  courseId: string | undefined,
  description: string | undefined
): UseCourseThumbnailReturn {
  const [url, setUrl] = useState<string | null>(
    courseId ? thumbnailCache.get(courseId) ?? null : null
  );
  const [loading, setLoading] = useState(!url && !!courseId && !!description);
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!courseId || !description) return;

    // Already have it
    if (thumbnailCache.has(courseId)) {
      setUrl(thumbnailCache.get(courseId)!);
      setLoading(false);
      return;
    }

    // Already fetching this one
    if (fetchedRef.current.has(courseId)) return;
    fetchedRef.current.add(courseId);

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/content/course-thumbnail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getBackendAuthHeaders()),
          },
          body: JSON.stringify({ course_id: courseId, description }),
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled && data.url) {
          thumbnailCache.set(courseId, data.url);
          setUrl(data.url);
        }
      } catch {
        // Fail silently — fallback icon will show
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, description]);

  return { url, loading };
}
