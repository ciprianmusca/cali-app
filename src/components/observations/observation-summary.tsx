"use client";

import { Button } from "@/components/ui/button";
import type { Observation } from "@/lib/types";
import { formatCoord, formatDateTime } from "@/lib/format";
import { speciesDisplayLabel } from "@/lib/species";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  crownKey,
  disturbanceKey,
  phenStageLabelKey,
  severityKey,
} from "@/lib/i18n/labels";

interface Props {
  draft: Observation;
  onConfirm: () => void;
  onBack: () => void;
}

/** DATA-10: review step before save. */
export function ObservationSummary({ draft, onConfirm, onBack }: Props) {
  const { t, locale } = useI18n();
  const loc = locale === "en" ? "en" : "ro";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="font-display text-3xl text-forest">
        {t("obs.summaryTitle")}
      </h1>
      <dl className="space-y-3 rounded-lg border bg-card/80 p-4 text-sm">
        {draft.species ? (
          <div>
            <dt className="text-muted-foreground">{t("obs.species")}</dt>
            <dd className="font-medium">
              {speciesDisplayLabel(draft.species, loc, draft.speciesOther)}
            </dd>
          </div>
        ) : null}
        {draft.module === "fenologie" ? (
          <>
            <div>
              <dt className="text-muted-foreground">{t("obs.stage")}</dt>
              <dd className="font-medium">
                {t(phenStageLabelKey(draft.stage))}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("phen.crownLabel")}</dt>
              <dd className="font-medium">
                {t(crownKey(draft.crownCondition))}
              </dd>
            </div>
          </>
        ) : null}
        {draft.module === "perturbari" ? (
          <>
            <div>
              <dt className="text-muted-foreground">{t("obs.types")}</dt>
              <dd className="font-medium">
                {draft.disturbanceTypes
                  .map((d) => t(disturbanceKey(d)))
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("obs.severity")}</dt>
              <dd className="font-medium">{t(severityKey(draft.severity))}</dd>
            </div>
          </>
        ) : null}
        {draft.module === "sol" ? (
          <div>
            <dt className="text-muted-foreground">{t("soil.plotHint")}</dt>
            <dd className="font-medium">{draft.plotSize}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">{t("obs.coords")}</dt>
          <dd className="font-medium">
            {formatCoord(draft.location.latitude)},{" "}
            {formatCoord(draft.location.longitude)}
            {draft.location.accuracy != null
              ? ` · ±${draft.location.accuracy} m`
              : ""}
            {draft.locationAdjusted ? ` · ${t("obs.locationAdjusted")}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("obs.summaryPhotos")}</dt>
          <dd className="font-medium">{draft.photos.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("obs.gpsTime")}</dt>
          <dd className="font-medium">
            {formatDateTime(draft.location.capturedAt)}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onConfirm}>
          {t("obs.summaryConfirm")}
        </Button>
        <Button type="button" variant="outline" onClick={onBack}>
          {t("obs.summaryBack")}
        </Button>
      </div>
    </div>
  );
}
