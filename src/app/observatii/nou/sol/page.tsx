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
import type { GeoLocation, SolObservation } from "@/lib/types";

type CoverKey = "moss" | "litter" | "plants" | "bare";

const LABELS: Record<CoverKey, { title: string; hint: string }> = {
  moss: {
    title: "Mușchi și licheni",
    hint: "Verde, textură moale",
  },
  litter: {
    title: "Litieră",
    hint: "Ace, frunze uscate, ramuri, lemn căzut",
  },
  plants: {
    title: "Plante",
    hint: "Ierburi, ferigi, subarbuști, puieți (ce se vede de sus)",
  },
  bare: {
    title: "Sol gol / rocă",
    hint: "Pământ sau stâncă vizibile fără acoperire",
  },
};

function SolForm() {
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser())!;
  const addObservation = useCaliStore((s) => s.addObservation);
  const nextCode = useCaliStore((s) => s.nextCode);
  const formRef = useRef<HTMLFormElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [cover, setCover] = useState<Partial<Record<CoverKey, number>>>({});
  const [seedlings, setSeedlings] = useState(false);
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const values = {
    moss: cover.moss ?? null,
    litter: cover.litter ?? null,
    plants: cover.plants ?? null,
    bare: cover.bare ?? null,
  };

  const sum =
    (values.moss ?? 0) +
    (values.litter ?? 0) +
    (values.plants ?? 0) +
    (values.bare ?? 0);

  const setPct = (key: CoverKey, pct: number) => {
    setCover((c) => ({ ...c, [key]: pct }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!photos.length) e.photos = "Adăugați cel puțin o poză.";
    if (
      values.moss == null ||
      values.litter == null ||
      values.plants == null ||
      values.bare == null
    ) {
      e.cover = "Setați toate cele 4 procente (pași de 5%).";
    } else if (sum !== 100) {
      e.cover = `Suma trebuie să fie 100% (acum ${sum}%).`;
    }
    if (!location) e.location = "Geolocația este obligatorie.";
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
    if (!validate() || !location) return;
    const obs: SolObservation = {
      id: `o-${crypto.randomUUID().slice(0, 8)}`,
      code: nextCode("sol"),
      module: "sol",
      status: "in_asteptare",
      authorId: user.id,
      authorRole: user.role,
      authorName: user.name,
      mossPct: values.moss!,
      litterPct: values.litter!,
      plantsPct: values.plants!,
      barePct: values.bare!,
      seedlingsPresent: seedlings,
      details: details.trim() || undefined,
      photos,
      location,
      createdAt: new Date().toISOString(),
    };
    addObservation(obs);
    if (andNew) {
      setPhotos([]);
      setCover({});
      setSeedlings(false);
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
      <h1 className="font-display text-3xl text-forest">Observație sol</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Estimați ce se vede de sus — stratul de deasupra contează. Suma
        celor 4 clase = 100%, pași de 5%. Cod: SOIL-NNNN.
      </p>

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
            <Label>Acoperire sol</Label>
            <span
              className={`text-sm font-medium ${
                sum === 100 ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              Sumă: {sum}%
            </span>
          </div>
          <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Regula: estimați ce se vede de sus; stratul de deasupra contează.
            Valorile pornesc nesetate.
          </p>
          {(Object.keys(LABELS) as CoverKey[]).map((key) => (
            <div key={key} className="rounded-lg border bg-card/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{LABELS[key].title}</div>
                  <div className="text-xs text-muted-foreground">
                    {LABELS[key].hint}
                  </div>
                </div>
                <div className="font-display text-xl tabular-nums">
                  {values[key] == null ? "—" : `${values[key]}%`}
                </div>
              </div>
              <Slider
                className="mt-4"
                min={0}
                max={100}
                step={5}
                value={values[key] != null ? [values[key]!] : [0]}
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
          Puieți prezenți (în afara sumei de 100%)
        </label>

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

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Salvare</Button>
          <Button type="button" variant="secondary" onClick={() => save(true)}>
            Salvare și formular nou
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
