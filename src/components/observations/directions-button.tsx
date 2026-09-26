"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCaliStore } from "@/lib/store";
import { mapsDirectionsUrl } from "@/lib/format";
import { haversineMeters } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";
import type { FieldActivity, Observation } from "@/lib/types";

/** ROL-07: elev may open navigation only inside their activity zone. */
export function DirectionsButton({
  observation,
  activity,
  variant = "button",
}: {
  observation: Observation;
  activity?: FieldActivity | null;
  variant?: "button" | "link";
}) {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const [warnOpen, setWarnOpen] = useState(false);
  const url = mapsDirectionsUrl(
    observation.location.latitude,
    observation.location.longitude
  );

  const isElev = user?.role === "elev";
  const inZone =
    !isElev ||
    (activity &&
      observation.activityId === activity.id &&
      haversineMeters(
        observation.location.latitude,
        observation.location.longitude,
        activity.zoneLat,
        activity.zoneLng
      ) <= activity.zoneRadiusM);

  if (isElev && !inZone) {
    return (
      <span className="text-xs text-muted-foreground">{t("dir.elevBlocked")}</span>
    );
  }

  const openNav = () => {
    window.open(url, "_blank", "noreferrer");
    setWarnOpen(false);
  };

  const trigger =
    variant === "link" ? (
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "shrink-0"
        )}
        onClick={() => (isElev ? setWarnOpen(true) : openNav())}
      >
        <ExternalLink className="size-3.5" />
        {t("obs.directions")}
      </button>
    ) : (
      <Button
        variant="outline"
        onClick={() => (isElev ? setWarnOpen(true) : openNav())}
      >
        <ExternalLink className="size-4" />
        {t("obs.directions")}
      </Button>
    );

  return (
    <>
      {trigger}
      <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dir.safetyTitle")}</DialogTitle>
            <DialogDescription>{t("dir.safetyBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarnOpen(false)}>
              {t("val.confirmCancel")}
            </Button>
            <Button onClick={openNav}>{t("dir.continue")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
