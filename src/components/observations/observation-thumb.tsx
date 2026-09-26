"use client";

import { useEffect, useState } from "react";
import type { ObservationModule } from "@/lib/types";
import { modulePlaceholder } from "@/lib/photos";
import { loadIdbPhoto, parseIdbPhotoRef } from "@/lib/photo-idb";
import { cn } from "@/lib/utils";

export function ObservationThumb({
  module,
  src,
  className,
  imgClassName,
  alt = "",
}: {
  module: ObservationModule;
  src?: string | null;
  className?: string;
  imgClassName?: string;
  /** UI-13: meaningful alt for photos when provided */
  alt?: string;
}) {
  const fallback = modulePlaceholder(module);
  const [current, setCurrent] = useState(src || fallback);

  useEffect(() => {
    let cancelled = false;
    const resolved = src || fallback;

    if (resolved.startsWith("idb:")) {
      const parsed = parseIdbPhotoRef(resolved);
      if (!parsed) {
        setCurrent(fallback);
        return;
      }
      void loadIdbPhoto(parsed.obsId, parsed.index).then((data) => {
        if (cancelled) return;
        if (data) {
          setCurrent(data);
          return;
        }
        setCurrent(
          `/api/observations/${parsed.obsId}/photo/${parsed.index}`
        );
      });
      return () => {
        cancelled = true;
      };
    }

    // Absolute/local placeholders always load from /public
    if (
      resolved.startsWith("/placeholders/") ||
      resolved.startsWith("/guide/") ||
      resolved.endsWith(".svg") ||
      resolved.endsWith(".jpg") ||
      resolved.endsWith(".png") ||
      resolved.startsWith("http") ||
      resolved.startsWith("data:") ||
      resolved.startsWith("/api/")
    ) {
      setCurrent(resolved);
    } else {
      setCurrent(fallback);
    }
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return (
    <div className={cn("overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={alt}
        className={cn("size-full object-cover", imgClassName)}
        onError={() => {
          if (current !== fallback) setCurrent(fallback);
        }}
      />
    </div>
  );
}
