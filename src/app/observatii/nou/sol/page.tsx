"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { GeoCapture } from "@/components/observations/geo-capture";
import { PhotoCapture } from "@/components/observations/photo-capture";
import { ObservationSummary } from "@/components/observations/observation-summary";
import { ActiveActivityHint } from "@/components/observations/active-activity-hint";
import { useCaliStore } from "@/lib/store";
import { enqueueObservationSave } from "@/lib/save-observation";
import { validateGpsNotAfterCreated } from "@/lib/migrate-observation";
import type { GeoLocation, PhotoMeta, SolObservation } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { MsgKey } from "@/lib/i18n/store";
import { GlossaryTip } from "@/components/glossary/glossary-tip";
import type { GlossaryTermId } from "@/lib/glossary";
import {
  suggestSoilCover,
  type SoilCoverSuggestion,
} from "@/lib/ai/soil-cover";

type CoverKey = "moss" | "litter" | "plants" | "bare";
const COVER_KEYS: CoverKey[] = ["moss", "litter", "plants", "bare"];
const COVER_MSG: Record<CoverKey, { title: MsgKey; hint: MsgKey }> = {
  moss: { title: "soil.moss", hint: "soil.mossHint" },
  litter: { title: "soil.litter", hint: "soil.litterHint" },
  plants: { title: "soil.plants", hint: "soil.plantsHint" },
  bare: { title: "soil.bare", hint: "soil.bareHint" },
};

function SolForm() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser());
  const nextCode = useCaliStore((s) => s.nextCode);
  const formRef = useRef<HTMLFormElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoMeta, setPhotoMeta] = useState<PhotoMeta[]>([]);
  const [cover, setCover] = useState<Record<CoverKey, number>>({
    moss: 0,
    litter: 0,
    plants: 0,
    bare: 0,
  });
  const [seedlings, setSeedlings] = useState(false);
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationAdjusted, setLocationAdjusted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<SolObservation | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<SoilCoverSuggestion | null>(
    null
  );

  const sum = cover.moss + cover.litter + cover.plants + cover.bare;

  const runAiSuggest = async () => {
    if (!photos[0]) {
      setAiNote(t("soil.aiNeedPhoto"));
      return;
    }
    setAiBusy(true);
    setAiNote(null);
    try {
      const suggestion = await suggestSoilCover(photos[0]);
      setCover(suggestion.cover);
      if (typeof suggestion.seedlingsPresent === "boolean") {
        setSeedlings(suggestion.seedlingsPresent);
      }
      setAiSuggestion(suggestion);
      setAiNote(
        suggestion.mode === "online"
          ? t("soil.aiAppliedOnline")
          : t("soil.aiAppliedOffline")
      );
      setErrors((e) => {
        const next = { ...e };
        delete next.cover;
        return next;
      });
    } catch {
      setAiNote(t("soil.aiError"));
    } finally {
      setAiBusy(false);
    }
  };

  const setPct = (key: CoverKey, pct: number) => {
    setCover((c) => ({ ...c, [key]: pct }));
  };

  const fillRest = () => {
    const diff = 100 - sum;
    if (diff === 0) return;
    // Put difference on last unset (0) class, else on bare.
    const unset = [...COVER_KEYS].reverse().find((k) => cover[k] === 0);
    const target = unset ?? "bare";
    setCover((c) => ({
      ...c,
      [target]: Math.max(0, Math.min(100, c[target] + diff)),
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!user) e.auth = t("error.invalidLogin");
    if (!photos.length) e.photos = t("error.photoRequired");
    if (sum !== 100) {
      e.cover =
        sum < 100
          ? t("soil.sumShort", { n: 100 - sum })
          : t("soil.sumOver", { n: sum - 100 });
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
      formRef.current
        ?.querySelector(`[data-field="${Object.keys(e)[0]}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || !user || !location) return;
    const createdAt = new Date().toISOString();
    setReview({
      id: `o-${crypto.randomUUID().slice(0, 8)}`,
      code: nextCode("sol"),
      module: "sol",
      status: "in_asteptare",
      authorId: user.id,
      authorRole: user.role,
      authorName: user.name,
      mossPct: cover.moss,
      litterPct: cover.litter,
      plantsPct: cover.plants,
      barePct: cover.bare,
      seedlingsPresent: seedlings,
      plotSize: "1x1m",
      aiCoverSuggestion: aiSuggestion
        ? {
            mossPct: aiSuggestion.cover.moss,
            litterPct: aiSuggestion.cover.litter,
            plantsPct: aiSuggestion.cover.plants,
            barePct: aiSuggestion.cover.bare,
            mode: aiSuggestion.mode,
            model: aiSuggestion.model,
            at: aiSuggestion.at,
          }
        : undefined,
      details: details.trim() || undefined,
      photos,
      photoMeta,
      location,
      locationAdjusted: locationAdjusted || undefined,
      createdAt,
    });
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
      <h1 className="font-display text-3xl text-forest">{t("soil.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("soil.sub")}</p>
      <div className="mt-4">
        <ActiveActivityHint />
      </div>
      <p className="mt-3 rounded-md border border-primary/30 bg-accent/40 px-3 py-2 text-sm font-medium text-forest">
        {t("soil.plotHint")}
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-6">
        <div data-field="photos">
          <PhotoCapture
            photos={photos}
            photoMeta={photoMeta}
            onChange={(p, m) => {
              setPhotos(p);
              setPhotoMeta(m);
              setAiSuggestion(null);
              setAiNote(null);
            }}
            error={errors.photos}
          />
        </div>

        <div className="space-y-2 rounded-lg border border-dashed border-primary/35 bg-accent/30 px-3 py-3">
          <p className="text-xs text-muted-foreground">{t("soil.aiHint")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={aiBusy || photos.length === 0}
            onClick={() => void runAiSuggest()}
          >
            {aiBusy ? t("soil.aiWorking") : t("soil.aiSuggest")}
          </Button>
          {aiNote ? (
            <p className="text-xs font-medium text-forest">{aiNote}</p>
          ) : null}
        </div>

        <div data-field="cover" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>{t("soil.cover")}</Label>
            <span
              className={`text-sm font-medium ${
                sum === 100 ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              {t("soil.sum")} {sum}%
            </span>
          </div>
          <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("soil.rule")}
          </p>
          {COVER_KEYS.map((key) => (
            <div key={key} className="rounded-lg border bg-card/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {t(COVER_MSG[key].title)}
                    {key === "litter" ? (
                      <GlossaryTip term={"litiera" as GlossaryTermId} />
                    ) : null}
                    {key === "moss" ? (
                      <GlossaryTip term={"muschi" as GlossaryTermId} />
                    ) : null}
                    {key === "bare" ? (
                      <GlossaryTip term={"sol_gol" as GlossaryTermId} />
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(COVER_MSG[key].hint)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={5}
                    aria-label={t(COVER_MSG[key].title)}
                    className="h-11 w-20 text-right tabular-nums"
                    value={cover[key]}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isNaN(n)) return;
                      const clamped = Math.max(0, Math.min(100, n));
                      const stepped = Math.round(clamped / 5) * 5;
                      setPct(key, stepped);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <Slider
                className="mt-4 min-h-11"
                min={0}
                max={100}
                step={5}
                value={[cover[key]]}
                aria-label={t(COVER_MSG[key].title)}
                onValueChange={(v) => {
                  const arr = Array.isArray(v) ? v : [v];
                  setPct(key, arr[0] ?? 0);
                }}
              />
            </div>
          ))}
          {sum !== 100 ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-destructive">
                {sum < 100
                  ? t("soil.sumShort", { n: 100 - sum })
                  : t("soil.sumOver", { n: sum - 100 })}
              </p>
              {sum < 100 ? (
                <Button type="button" size="sm" variant="outline" onClick={fillRest}>
                  {t("soil.fillRest")}
                </Button>
              ) : null}
            </div>
          ) : null}
          {errors.cover ? (
            <p className="text-sm text-destructive">{errors.cover}</p>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={seedlings}
            onCheckedChange={(v) => setSeedlings(v === true)}
          />
          {t("soil.seedlingsCheck")}
        </label>

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

        <Button type="submit">{t("obs.save")}</Button>
      </form>
    </div>
  );
}

export default function SolPage() {
  return (
    <AuthGate>
      <SolForm />
    </AuthGate>
  );
}
