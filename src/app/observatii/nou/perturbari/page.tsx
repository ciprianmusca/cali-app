"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import type {
  DisturbanceType,
  GeoLocation,
  PerturbariObservation,
  Species,
} from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import { disturbanceKey, severityKey, speciesKey } from "@/lib/i18n/labels";

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

const DISTURBANCE_TYPES: DisturbanceType[] = [
  "atac_insecte",
  "doboratura_vant",
  "uscare",
  "rupturi_zapada",
  "ciuperci",
  "vatamari_vanat",
  "incendiu",
  "alta",
];

function PerturbariForm() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser())!;
  const addObservation = useCaliStore((s) => s.addObservation);
  const nextCode = useCaliStore((s) => s.nextCode);
  const formRef = useRef<HTMLFormElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [types, setTypes] = useState<DisturbanceType[]>([]);
  const [insectType, setInsectType] = useState("");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [area, setArea] = useState("");
  const [species, setSpecies] = useState<Species | "">("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleType = (d: DisturbanceType) => {
    setTypes((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!photos.length) e.photos = t("error.photoRequired");
    if (!types.length) e.types = t("error.disturbanceType");
    if (!species) e.species = t("error.speciesRequired");
    if (!severity) e.severity = t("error.severityRequired");
    if (!area.trim() || Number(area.replace(",", ".")) <= 0)
      e.area = t("error.areaRequired");
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

  const save = (andNew: boolean) => {
    if (!validate() || !location || !severity || !species) return;
    const obs: PerturbariObservation = {
      id: `o-${crypto.randomUUID().slice(0, 8)}`,
      code: nextCode("perturbari"),
      module: "perturbari",
      status: "in_asteptare",
      authorId: user.id,
      authorRole: user.role,
      authorName: user.name,
      disturbanceTypes: types,
      insectType: types.includes("atac_insecte")
        ? insectType.trim() || undefined
        : undefined,
      severity,
      affectedAreaSqm: Number(area.replace(",", ".")),
      species,
      details: details.trim() || undefined,
      photos,
      location,
      createdAt: new Date().toISOString(),
    };
    addObservation(obs);
    if (andNew) {
      setPhotos([]);
      setTypes([]);
      setInsectType("");
      setSeverity(null);
      setArea("");
      setSpecies("");
      setDetails("");
      setErrors({});
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
      <h1 className="font-display text-3xl text-forest">{t("dist.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("dist.sub")}</p>

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
            value={species}
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

        <div data-field="types" className="space-y-3">
          <Label>
            {t("dist.typeLabel")} <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISTURBANCE_TYPES.map((d) => (
              <label
                key={d}
                className="flex items-center gap-2 rounded-md border bg-card/60 px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={types.includes(d)}
                  onCheckedChange={() => toggleType(d)}
                />
                {t(disturbanceKey(d))}
              </label>
            ))}
          </div>
          {errors.types ? (
            <p className="text-sm text-destructive">{errors.types}</p>
          ) : null}
        </div>

        {types.includes("atac_insecte") ? (
          <div className="space-y-2">
            <Label htmlFor="insect">{t("dist.insectOptional")}</Label>
            <Input
              id="insect"
              placeholder={t("dist.insectPlaceholder")}
              value={insectType}
              onChange={(e) => setInsectType(e.target.value)}
            />
          </div>
        ) : null}

        <div data-field="severity" className="space-y-3">
          <Label>
            {t("dist.severityLabel")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2">
            {([1, 2, 3, 4, 5] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  severity === s
                    ? "border-primary bg-accent"
                    : "border-border bg-card/60"
                }`}
              >
                <strong>{s}</strong> — {t(severityKey(s))}
              </button>
            ))}
          </div>
          {errors.severity ? (
            <p className="text-sm text-destructive">{errors.severity}</p>
          ) : null}
        </div>

        <div data-field="area" className="space-y-2">
          <Label htmlFor="area">
            {t("dist.areaLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="area"
            inputMode="decimal"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="ex. 40"
          />
          {errors.area ? (
            <p className="text-sm text-destructive">{errors.area}</p>
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

        <div className="flex flex-wrap gap-3">
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

export default function PerturbariPage() {
  return (
    <AuthGate>
      <PerturbariForm />
    </AuthGate>
  );
}
