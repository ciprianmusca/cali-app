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
import { enqueueObservationSave } from "@/lib/save-observation";
import { PHENOLOGY_STAGES } from "@/lib/constants";
import type {
  FenologieObservation,
  GeoLocation,
  PhenologyStage,
  Species,
} from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  phenStageDescKey,
  phenStageLabelKey,
  speciesKey,
} from "@/lib/i18n/labels";

const SPECIES: Species[] = [
  "picea_abies",
  "abies_alba",
  "fagus_sylvatica",
  "pinus_sylvestris",
  "larix_decidua",
  "acer_pseudoplatanus",
  "sorbus_aucuparia",
  "alta",
];

function FenologieForm() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser());
  const nextCode = useCaliStore((s) => s.nextCode);
  const formRef = useRef<HTMLFormElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [stage, setStage] = useState<PhenologyStage | null>(null);
  const [species, setSpecies] = useState<Species | "">("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!user) e.auth = t("error.invalidLogin");
    if (!photos.length) e.photos = t("error.photoRequired");
    if (!stage) e.stage = t("error.stageRequired");
    if (!species) e.species = t("error.speciesRequired");
    if (!location) e.location = t("error.locationRequired");
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      const el = formRef.current?.querySelector(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setPhotos([]);
    setStage(null);
    setSpecies("");
    setDetails("");
    setLocation(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = (andNew: boolean) => {
    if (!validate() || !user || !location || !stage || !species) return;

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

    // Leave the form immediately — persist/sync runs in the background.
    if (andNew) resetForm();
    else router.replace("/observatii");
    enqueueObservationSave(obs);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl text-forest">{t("phen.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("phen.sub")}</p>

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
            {t("obs.species")} <span className="text-destructive">*</span>
          </Label>
          <Select
            value={species || undefined}
            onValueChange={(v) => setSpecies((v ?? "") as Species)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("obs.selectSpecies")} />
            </SelectTrigger>
            <SelectContent>
              {SPECIES.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(speciesKey(k))}
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
            {t("phen.stageLabel")} <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2">
            {([1, 2, 3, 4, 5] as PhenologyStage[]).map((s) => {
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
                    style={{ background: PHENOLOGY_STAGES[s].color }}
                  >
                    {s}
                  </span>
                  <span>
                    <span className="font-medium">{t(phenStageLabelKey(s))}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t(phenStageDescKey(s))}
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
          <Label htmlFor="details">{t("obs.detailsOptional")}</Label>
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

        {Object.keys(errors).length > 0 ? (
          <p className="text-sm text-destructive" data-field="auth">
            {t("obs.fixIncomplete")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit">{t("obs.save")}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => save(true)}
          >
            {t("obs.saveAndNew")}
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
