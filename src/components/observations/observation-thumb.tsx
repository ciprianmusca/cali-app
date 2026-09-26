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
}: {
  module: ObservationModule;
  src?: string | null;
  className?: string;
  imgClassName?: string;
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
        if (!cancelled) setCurrent(data || fallback);
      });
      return () => {
        cancelled = true;
      };
    }

    setCurrent(resolved);
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return (
    <div className={cn("overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        className={cn("size-full object-cover", imgClassName)}
        onError={() => {
          if (current !== fallback) setCurrent(fallback);
        }}
      />
    </div>
  );
}
