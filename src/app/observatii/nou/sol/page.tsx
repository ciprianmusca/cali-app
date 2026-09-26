"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { GeoCapture } from "@/components/observations/geo-capture";
import { PhotoCapture } from "@/components/observations/photo-capture";
import { useCaliStore } from "@/lib/store";
import { enqueueObservationSave } from "@/lib/save-observation";
import type { GeoLocation, SolObservation } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { MsgKey } from "@/lib/i18n/store";

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
  const [cover, setCover] = useState<Record<CoverKey, number>>({
    moss: 0,
    litter: 0,
    plants: 0,
    bare: 0,
  });
  const [seedlings, setSeedlings] = useState(false);
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sum = cover.moss + cover.litter + cover.plants + cover.bare;

  const setPct = (key: CoverKey, pct: number) => {
    setCover((c) => ({ ...c, [key]: pct }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!user) e.auth = t("error.invalidLogin");
    if (!photos.length) e.photos = t("error.photoRequired");
    if (sum !== 100) {
      e.cover = t("error.coverSum", { sum });
    }
    if (!location) e.location = t("error.locationRequired");
    setErrors(e);
    if (Object.keys(e).length) {
      const el = formRef.current?.querySelector(
        `[data-field="${Object.keys(e)[0]}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setPhotos([]);
    setCover({ moss: 0, litter: 0, plants: 0, bare: 0 });
    setSeedlings(false);
    setDetails("");
    setLocation(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = (andNew: boolean) => {
    if (!validate() || !user || !location) return;

    const obs: SolObservation = {
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
      details: details.trim() || undefined,
      photos,
      location,
      createdAt: new Date().toISOString(),
    };

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
      <h1 className="font-display text-3xl text-forest">{t("soil.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("soil.sub")}</p>

      <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-6">
        <div data-field="photos">
          <PhotoCapture
            photos={photos}
            onChange={setPhotos}
            error={errors.photos}
          />
        </div>

        <div data-field="cover" className="space-y-4">
          <div className="flex items-center justify-between">
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
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(COVER_MSG[key].hint)}
                  </div>
                </div>
                <div className="font-display text-xl tabular-nums">
                  {cover[key]}%
                </div>
              </div>
              <Slider
                className="mt-4"
                min={0}
                max={100}
                step={5}
                value={[cover[key]]}
                onValueChange={(v) => {
                  const arr = Array.isArray(v) ? v : [v];
                  setPct(key, arr[0] ?? 0);
                }}
              />
            </div>
          ))}
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
          <GeoCapture value={location} onChange={setLocation} />
          {errors.location ? (
            <p className="mt-2 text-sm text-destructive">{errors.location}</p>
          ) : null}
        </div>

        {Object.keys(errors).length > 0 ? (
          <p className="text-sm text-destructive" data-field="auth">
            {t("obs.formIncomplete")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit">{t("obs.save")}</Button>
          <Button type="button" variant="secondary" onClick={() => save(true)}>
            {t("obs.saveAndNew")}
          </Button>
        </div>
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
