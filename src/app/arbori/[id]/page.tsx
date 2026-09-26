"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/layout/auth-gate";
import { ModuleBadge, StatusBadge } from "@/components/observations/badges";
import type { Observation, SentinelTree } from "@/lib/types";
import { formatCoord, formatDateTime } from "@/lib/format";
import { speciesDisplayLabel } from "@/lib/species";
import { useI18n } from "@/lib/i18n/use-i18n";

function TreeDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const loc = locale === "en" ? "en" : "ro";
  const [tree, setTree] = useState<SentinelTree | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetch(`/api/trees/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = (await res.json()) as {
          tree?: SentinelTree;
          observations?: Observation[];
        };
        setTree(data.tree ?? null);
        setObservations(data.observations ?? []);
      })
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p>{t("obs.notFound")}</p>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">
        …
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted-foreground">{t("tree.title")}</p>
      <h1 className="font-display text-3xl text-forest">{tree.code}</h1>
      <p className="mt-2 text-sm">
        {speciesDisplayLabel(tree.species, loc, tree.speciesOther)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatCoord(tree.latitude)}, {formatCoord(tree.longitude)} ·{" "}
        {formatDateTime(tree.createdAt)} · {tree.createdByName}
      </p>

      <h2 className="mt-10 font-display text-xl">{t("tree.history")}</h2>
      {observations.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("tree.empty")}</p>
      ) : (
        <div className="mt-3 divide-y rounded-lg border bg-card/80">
          {observations.map((o) => (
            <Link
              key={o.id}
              href={`/observatii/${o.id}`}
              className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm hover:bg-muted/40"
            >
              <span className="font-medium">{o.code}</span>
              <ModuleBadge module={o.module} />
              <StatusBadge status={o.status} />
              <span className="text-muted-foreground">
                {formatDateTime(o.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGate>
      <TreeDetail id={id} />
    </AuthGate>
  );
}
