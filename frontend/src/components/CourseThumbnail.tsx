"use client";

import Image from "next/image";
import { BookOpen, CheckCircle } from "lucide-react";
import { useCourseThumbnail } from "@/hooks/useCourseThumbnail";

interface CourseThumbnailProps {
  courseId: string;
  description: string;
  isCompleted: boolean;
}

export function CourseThumbnail({
  courseId,
  description,
  isCompleted,
}: CourseThumbnailProps) {
  const { url, loading } = useCourseThumbnail(courseId, description);

  return (
    <div className="h-24 bg-primary/10 flex items-center justify-center relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
      )}
      {url ? (
        <>
          <Image
            src={url}
            alt={description}
            fill
            className="object-cover"
            sizes="180px"
            unoptimized={url.startsWith("data:")}
          />
          {isCompleted && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          )}
        </>
      ) : (
        <>
          {isCompleted ? (
            <CheckCircle className="w-10 h-10 text-success" />
          ) : (
            <BookOpen className="w-10 h-10 text-primary/30" />
          )}
        </>
      )}
    </div>
  );
}
