"use client";

import { FormEvent, use, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SpeciesSelect } from "@/components/observations/species-select";
import { useCaliStore } from "@/lib/store";
import type { Observation, Species } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";

function EditForm({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser())!;
  const obs = useCaliStore((s) => s.observations.find((o) => o.id === id));
  const updateObservation = useCaliStore((s) => s.updateObservation);
  const flushOfflineQueue = useCaliStore((s) => s.flushOfflineQueue);

  const [species, setSpecies] = useState<Species | "">(obs?.species ?? "");
  const [speciesOther, setSpeciesOther] = useState(obs?.speciesOther ?? "");
  const [details, setDetails] = useState(obs?.details ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!obs) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p>{t("obs.notFound")}</p>
      </div>
    );
  }

  if (
    (obs.status !== "in_asteptare" && obs.status !== "clarificare") ||
    obs.authorId !== user.id
  ) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p>{t("error.forbidden") ?? t("obs.error")}</p>
      </div>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!species) {
      setError(t("error.speciesRequired"));
      return;
    }
    if (species === "alta" && !speciesOther.trim()) {
      setError(t("error.speciesOther"));
      return;
    }
    const entry = {
      at: new Date().toISOString(),
      byId: user.id,
      byName: user.name,
      summary: `specie → ${species}${species === "alta" ? ` (${speciesOther.trim()})` : ""}`,
    };
    const patch: Partial<Observation> = {
      species,
      speciesOther: species === "alta" ? speciesOther.trim() : undefined,
      details: details.trim() || undefined,
      editHistory: [...(obs.editHistory ?? []), entry],
      syncStatus: "pending",
    };
    updateObservation(id, patch);
    const updated = {
      ...obs,
      ...patch,
    } as Observation;
    useCaliStore.setState({
      offlineQueue: [
        updated,
        ...useCaliStore.getState().offlineQueue.filter((o) => o.id !== id),
      ],
    });
    void flushOfflineQueue();
    router.replace(`/observatii/${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl text-forest">
        {t("obs.edit")} · {obs.code}
      </h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <SpeciesSelect
          species={species}
          speciesOther={speciesOther}
          onSpeciesChange={setSpecies}
          onOtherChange={setSpeciesOther}
        />
        <div className="space-y-2">
          <Label htmlFor="details">{t("obs.detailsOptional")}</Label>
          <Textarea
            id="details"
            value={details}
            onChange={(ev) => setDetails(ev.target.value)}
            rows={3}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-3">
          <Button type="submit">{t("obs.save")}</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            {t("obs.summaryBack")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditObservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGate>
      <EditForm id={id} />
    </AuthGate>
  );
}
