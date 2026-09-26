"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/format";
import { extractPhotoMeta } from "@/lib/exif";
import type { PhotoMeta } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";

interface Props {
  photos: string[];
  photoMeta?: PhotoMeta[];
  onChange: (photos: string[], meta: PhotoMeta[]) => void;
  error?: string;
}

/** DATA-12: separate camera vs gallery; DATA-08: EXIF before compress. */
export function PhotoCapture({
  photos,
  photoMeta = [],
  onChange,
  error,
}: Props) {
  const { t } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const nextPhotos: string[] = [];
      const nextMeta: PhotoMeta[] = [];
      for (const file of Array.from(files)) {
        const meta = await extractPhotoMeta(file);
        const dataUrl = await compressImage(file);
        nextPhotos.push(dataUrl);
        nextMeta.push(meta);
      }
      onChange([...photos, ...nextPhotos], [...photoMeta, ...nextMeta]);
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium">
          {t("obs.photos")} <span className="text-destructive">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="size-4" />
            {busy ? t("obs.compressing") : t("obs.takeCamera")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => galleryRef.current?.click()}
          >
            <ImageIcon className="size-4" />
            {t("obs.fromGallery")}
          </Button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("obs.photoHint")}</p>
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
                alt={`${t("obs.photos")} ${i + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-background/90 p-1"
                onClick={() =>
                  onChange(
                    photos.filter((_, j) => j !== i),
                    photoMeta.filter((_, j) => j !== i)
                  )
                }
                aria-label={t("obs.deletePhoto")}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-10 text-sm text-muted-foreground">
          <Camera className="size-6" />
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => cameraRef.current?.click()}
            >
              {t("obs.takeCamera")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => galleryRef.current?.click()}
            >
              {t("obs.fromGallery")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
