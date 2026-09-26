"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GeoCapture } from "@/components/observations/geo-capture";
import { PhotoCapture } from "@/components/observations/photo-capture";
import { SpeciesSelect } from "@/components/observations/species-select";
import { ObservationSummary } from "@/components/observations/observation-summary";
import { useCaliStore } from "@/lib/store";
import { enqueueObservationSave } from "@/lib/save-observation";
import { CROWN_CONDITIONS, PHENOLOGY_STAGES } from "@/lib/constants";
import { validateGpsNotAfterCreated } from "@/lib/migrate-observation";
import type {
  CrownCondition,
  FenologieObservation,
  GeoLocation,
  PhenologyStage,
  PhotoMeta,
  Species,
} from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  crownKey,
  phenStageDescKey,
  phenStageLabelKey,
} from "@/lib/i18n/labels";

function FenologieForm() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser());
  const nextCode = useCaliStore((s) => s.nextCode);
  const formRef = useRef<HTMLFormElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoMeta, setPhotoMeta] = useState<PhotoMeta[]>([]);
  const [stage, setStage] = useState<PhenologyStage | null>(null);
  const [crown, setCrown] = useState<CrownCondition | "">("");
  const [species, setSpecies] = useState<Species | "">("");
  const [speciesOther, setSpeciesOther] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationAdjusted, setLocationAdjusted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<FenologieObservation | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!user) e.auth = t("error.invalidLogin");
    if (!photos.length) e.photos = t("error.photoRequired");
    if (!stage) e.stage = t("error.stageRequired");
    if (!crown) e.crown = t("error.crownRequired");
    if (!species) e.species = t("error.speciesRequired");
    if (species === "alta" && !speciesOther.trim()) {
      e.speciesOther = t("error.speciesOther");
    }
    if (!location) e.location = t("error.locationRequired");
    const createdAt = new Date().toISOString();
    if (
      location &&
      !validateGpsNotAfterCreated(location.capturedAt, createdAt)
    ) {
      e.location = t("error.gpsAfterCreated");
    }
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      formRef.current
        ?.querySelector(`[data-field="${first}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const buildDraft = (): FenologieObservation | null => {
    if (!user || !location || !stage || !species || !crown) return null;
    const createdAt = new Date().toISOString();
    return {
      id: `o-${crypto.randomUUID().slice(0, 8)}`,
      code: nextCode("fenologie"),
      module: "fenologie",
      status: "in_asteptare",
      authorId: user.id,
      authorRole: user.role,
      authorName: user.name,
      stage,
      crownCondition: crown,
      species,
      speciesOther:
        species === "alta" ? speciesOther.trim() : undefined,
      details: details.trim() || undefined,
      photos,
      photoMeta,
      location,
      locationAdjusted: locationAdjusted || undefined,
      createdAt,
    };
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const draft = buildDraft();
    if (draft) setReview(draft);
  };

  if (review) {
    return (
      <ObservationSummary
        draft={review}
        onBack={() => setReview(null)}
        onConfirm={() => {
          enqueueObservationSave(review);
          router.replace("/observatii");
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl text-forest">{t("phen.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("phen.sub")}</p>

      <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-6">
        <div data-field="photos">
          <PhotoCapture
            photos={photos}
            photoMeta={photoMeta}
            onChange={(p, m) => {
              setPhotos(p);
              setPhotoMeta(m);
            }}
            error={errors.photos}
          />
        </div>

        <SpeciesSelect
          species={species}
          speciesOther={speciesOther}
          onSpeciesChange={setSpecies}
          onOtherChange={setSpeciesOther}
          error={errors.species}
          otherError={errors.speciesOther}
        />

        <div data-field="stage" className="space-y-3">
          <Label>
            {t("phen.stageLabel")} <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2">
            {([1, 2, 3, 4] as PhenologyStage[]).map((s) => {
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
                    <span className="font-medium">
                      {t(phenStageLabelKey(s))}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t(phenStageDescKey(s, species || undefined))}
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

        <div data-field="crown" className="space-y-3">
          <Label>
            {t("phen.crownLabel")} <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {CROWN_CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCrown(c)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  crown === c
                    ? "border-primary bg-accent"
                    : "border-border bg-card/60"
                }`}
              >
                {t(crownKey(c))}
              </button>
            ))}
          </div>
          {errors.crown ? (
            <p className="text-sm text-destructive">{errors.crown}</p>
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
          <GeoCapture
            value={location}
            onChange={(loc, adjusted) => {
              setLocation(loc);
              if (adjusted) setLocationAdjusted(true);
              else if (loc) setLocationAdjusted(false);
            }}
          />
          {errors.location ? (
            <p className="mt-2 text-sm text-destructive">{errors.location}</p>
          ) : null}
        </div>

        {Object.keys(errors).length > 0 ? (
          <p className="text-sm text-destructive">{t("obs.formIncomplete")}</p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit">{t("obs.save")}</Button>
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
