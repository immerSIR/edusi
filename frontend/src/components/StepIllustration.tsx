"use client";

import { useStepIllustration } from "@/hooks/useStepIllustration";
import Image from "next/image";

interface StepIllustrationProps {
  lessonId: string;
  stepIndex: number;
  description: string;
}

export function StepIllustration({
  lessonId,
  stepIndex,
  description,
}: StepIllustrationProps) {
  const { url, loading, error } = useStepIllustration(
    lessonId,
    stepIndex,
    description
  );

  return (
    <div className="w-full max-w-xs h-48 rounded-2xl mb-6 overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {url && !error && (
        <Image
          src={url}
          alt={description}
          fill
          className="object-cover rounded-2xl"
          sizes="320px"
          unoptimized={url.startsWith("data:")}
        />
      )}
      {error && (
        <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
          <p className="text-xs text-text-secondary px-4 text-center">
            Illustration unavailable
          </p>
        </div>
      )}
    </div>
  );
}
