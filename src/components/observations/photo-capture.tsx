"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/format";

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  error?: string;
}

export function PhotoCapture({ photos, onChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const next: string[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await compressImage(file);
        next.push(dataUrl);
      }
      onChange([...photos, ...next]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Poze <span className="text-destructive">*</span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" />
          {busy ? "Comprimare…" : "Adaugă poză"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Imaginile se comprimă pe dispozitiv (~1600 px, &lt;500 KB) pentru
        sincronizare la semnal slab.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((src, i) => (
            <div
              key={i}
              className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Poză ${i + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-background/90 p-1"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                aria-label="Șterge poza"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-10 text-sm text-muted-foreground transition hover:bg-muted/70"
        >
          <Camera className="size-6" />
          Faceți o poză sau încărcați din galerie
        </button>
      )}
    </div>
  );
}
