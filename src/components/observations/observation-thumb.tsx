"use client";

import { useEffect, useState } from "react";
import type { ObservationModule } from "@/lib/types";
import { modulePlaceholder } from "@/lib/photos";
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
    setCurrent(src || fallback);
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
