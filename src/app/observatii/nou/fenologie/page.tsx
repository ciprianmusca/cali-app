"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GeoCapture } from "@/components/observations/geo-capture";
import { PhotoCapture } from "@/components/observations/photo-capture";
import { useCaliStore } from "@/lib/store";
import { PHENOLOGY_STAGES, SPECIES_LABELS } from "@/lib/constants";
import type {
  FenologieObservation,
  GeoLocation,
  PhenologyStage,
  Species,
} from "@/lib/types";

function FenologieForm() {
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser())!;
  const addObservation = useCaliStore((s) => s.addObservation);
  const nextCode = useCaliStore((s) => s.nextCode);
  const formRef = useRef<HTMLFormElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [stage, setStage] = useState<PhenologyStage | null>(null);
  const [species, setSpecies] = useState<Species | "">("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!photos.length) e.photos = "Adăugați cel puțin o poză.";
    if (!stage) e.stage = "Selectați stadiul fenologic.";
    if (!species) e.species = "Selectați specia.";
    if (!location) e.location = "Geolocația este obligatorie.";
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      const el = formRef.current?.querySelector(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const save = (andNew: boolean) => {
    if (!validate() || !location || !stage || !species) return;
    setSaving(true);
    const obs: FenologieObservation = {
      id: `o-${crypto.randomUUID().slice(0, 8)}`,
      code: nextCode("fenologie"),
      module: "fenologie",
      status: "in_asteptare",
      authorId: user.id,
      authorRole: user.role,
      authorName: user.name,
      stage,
      species,
      details: details.trim() || undefined,
      photos,
      location,
      createdAt: new Date().toISOString(),
    };
    addObservation(obs);
    if (andNew) {
      setPhotos([]);
      setStage(null);
      setSpecies("");
      setDetails("");
      setErrors({});
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/observatii");
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl text-forest">Observație fenologie</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Fotografiați un arbore și încadrați stadiul fenologic. Codul se
        generează automat (PHEN-NNNN).
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-6">
        <div data-field="photos">
          <PhotoCapture
            photos={photos}
            onChange={setPhotos}
            error={errors.photos}
          />
        </div>

        <div data-field="species" className="space-y-2">
          <Label>
            Specie <span className="text-destructive">*</span>
          </Label>
          <Select
            value={species}
            onValueChange={(v) => setSpecies(v as Species)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selectați specia" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SPECIES_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.species ? (
            <p className="text-sm text-destructive">{errors.species}</p>
          ) : null}
        </div>

        <div data-field="stage" className="space-y-3">
          <Label>
            Stadiu fenologic <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2">
            {([1, 2, 3, 4, 5] as PhenologyStage[]).map((s) => {
              const info = PHENOLOGY_STAGES[s];
              const selected = stage === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
                    selected
                      ? "border-primary bg-accent"
                      : "border-border bg-card/60 hover:bg-muted/50"
                  }`}
                >
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
                    style={{ background: info.color }}
                  >
                    {s}
                  </span>
                  <span>
                    <span className="font-medium">{info.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {info.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {errors.stage ? (
            <p className="text-sm text-destructive">{errors.stage}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="details">Detalii (opțional)</Label>
          <Textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>

        <div data-field="location">
          <GeoCapture value={location} onChange={setLocation} />
          {errors.location ? (
            <p className="mt-2 text-sm text-destructive">{errors.location}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            Salvare
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => save(true)}
          >
            Salvare și formular nou
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function FenologiePage() {
  return (
    <AuthGate>
      <FenologieForm />
    </AuthGate>
  );
}
