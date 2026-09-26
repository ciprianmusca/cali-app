"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GeoCapture } from "@/components/observations/geo-capture";
import { PhotoCapture } from "@/components/observations/photo-capture";
import { SpeciesSelect } from "@/components/observations/species-select";
import { ObservationSummary } from "@/components/observations/observation-summary";
import { useCaliStore } from "@/lib/store";
import { enqueueObservationSave } from "@/lib/save-observation";
import { haversineMeters } from "@/lib/format";
import { validateGpsNotAfterCreated } from "@/lib/migrate-observation";
import { speciesDisplayLabel } from "@/lib/species";
import type {
  DisturbanceType,
  GeoLocation,
  PerturbariObservation,
  PhotoMeta,
  SentinelTree,
  Species,
} from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import { disturbanceKey, severityKey } from "@/lib/i18n/labels";
import { GlossaryTip } from "@/components/glossary/glossary-tip";

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
  const { t, locale } = useI18n();
  const loc = locale === "en" ? "en" : "ro";
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser());
  const nextCode = useCaliStore((s) => s.nextCode);
  const formRef = useRef<HTMLFormElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoMeta, setPhotoMeta] = useState<PhotoMeta[]>([]);
  const [types, setTypes] = useState<DisturbanceType[]>([]);
  const [insectType, setInsectType] = useState("");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [area, setArea] = useState("");
  const [species, setSpecies] = useState<Species | "">("");
  const [speciesOther, setSpeciesOther] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationAdjusted, setLocationAdjusted] = useState(false);
  const [trees, setTrees] = useState<SentinelTree[]>([]);
  const [sentinelTreeId, setSentinelTreeId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<PerturbariObservation | null>(null);

  useEffect(() => {
    void fetch("/api/trees", { credentials: "include" })
      .then((r) => r.json() as Promise<{ trees?: SentinelTree[] }>)
      .then((d) => setTrees(d.trees ?? []))
      .catch(() => undefined);
  }, []);

  const nearby = useMemo(() => {
    if (!location) return [];
    return [...trees]
      .map((tr) => ({
        tree: tr,
        m: Math.round(
          haversineMeters(
            location.latitude,
            location.longitude,
            tr.latitude,
            tr.longitude
          )
        ),
      }))
      .sort((a, b) => a.m - b.m)
      .slice(0, 8);
  }, [trees, location]);

  const toggleType = (d: DisturbanceType) => {
    setTypes((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!user) e.auth = t("error.invalidLogin");
    if (!photos.length) e.photos = t("error.photoRequired");
    if (!types.length) e.types = t("error.disturbanceType");
    if (!species) e.species = t("error.speciesRequired");
    if (species === "alta" && !speciesOther.trim()) {
      e.speciesOther = t("error.speciesOther");
    }
    if (!severity) e.severity = t("error.severityRequired");
    if (!area.trim() || Number(area.replace(",", ".")) <= 0)
      e.area = t("error.areaRequired");
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
    if (!validate() || !user || !location || !severity || !species) return;
    const createdAt = new Date().toISOString();
    setReview({
      id: `o-${crypto.randomUUID().slice(0, 8)}`,
      code: nextCode("perturbari"),
      module: "perturbari",
      status: "in_asteptare",
      authorId: user.id,
      authorRole: user.role,
      authorName: user.name,
      disturbanceTypes: types,
      insectType: insectType.trim() || undefined,
      severity,
      affectedAreaSqm: Number(area.replace(",", ".")),
      species,
      speciesOther:
        species === "alta" ? speciesOther.trim() : undefined,
      details: details.trim() || undefined,
      photos,
      photoMeta,
      location,
      locationAdjusted: locationAdjusted || undefined,
      sentinelTreeId: sentinelTreeId || undefined,
      isSentinelTree: Boolean(sentinelTreeId) || undefined,
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
      <h1 className="font-display text-3xl text-forest">{t("dist.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("dist.sub")}</p>

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

        <div data-field="types" className="space-y-2">
          <Label>
            {t("dist.typeLabel")}
            <GlossaryTip term="perturbare" />{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISTURBANCE_TYPES.map((d) => (
              <label
                key={d}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
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
              value={insectType}
              onChange={(e) => setInsectType(e.target.value)}
              placeholder={t("dist.insectPlaceholder")}
            />
          </div>
        ) : null}

        <div data-field="severity" className="space-y-2">
          <Label>
            {t("dist.severityLabel")}
            <GlossaryTip term="severitate" />{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSeverity(n)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  severity === n
                    ? "border-primary bg-accent"
                    : "border-border bg-card/60"
                }`}
              >
                {n} — {t(severityKey(n))}
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

        <div className="space-y-2 rounded-lg border p-4">
          <Label>{t("obs.linkTree")}</Label>
          {nearby.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("obs.noNearbyTrees")}
            </p>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tree"
                  checked={!sentinelTreeId}
                  onChange={() => setSentinelTreeId("")}
                />
                —
              </label>
              {nearby.map(({ tree: tr, m }) => (
                <label
                  key={tr.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="tree"
                    checked={sentinelTreeId === tr.id}
                    onChange={() => setSentinelTreeId(tr.id)}
                  />
                  {tr.code} · {speciesDisplayLabel(tr.species, loc, tr.speciesOther)}{" "}
                  · {t("tree.distance", { m })}
                </label>
              ))}
            </div>
          )}
        </div>

        <Button type="submit">{t("obs.save")}</Button>
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
