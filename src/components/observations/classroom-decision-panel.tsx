"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClassroomBadge } from "@/components/observations/badges";
import { classroomStatusOf } from "@/lib/classroom";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { ClassroomStatus, Observation } from "@/lib/types";

type Props = {
  observation: Observation;
  onUpdated: (obs: Observation) => void;
  compact?: boolean;
};

export function ClassroomDecisionPanel({
  observation,
  onUpdated,
  compact = false,
}: Props) {
  const { t } = useI18n();
  const [comment, setComment] = useState(
    observation.classroomComment ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const current = classroomStatusOf(observation);

  const submit = async (decision: ClassroomStatus) => {
    setMsg(null);
    if (decision === "respins" && !comment.trim()) {
      setMsg(t("school.validateComment"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/observations/${encodeURIComponent(observation.id)}/classroom`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            comment: comment.trim() || undefined,
          }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        observation?: Observation;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.observation) {
        setMsg(t("school.validateError"));
        return;
      }
      onUpdated(data.observation);
      setMsg(t("school.validateOk"));
    } catch {
      setMsg(t("school.validateError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "space-y-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3"
          : "space-y-3 rounded-lg border bg-card/80 p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{t("class.track")}</span>
        <ClassroomBadge status={current} />
        {observation.classroomByName ? (
          <span className="text-xs text-muted-foreground">
            {observation.classroomByName}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{t("class.trackHint")}</p>
      <div className="space-y-1">
        <Label htmlFor={`class-cmt-${observation.id}`}>
          {t("school.validateComment")}
        </Label>
        <Textarea
          id={`class-cmt-${observation.id}`}
          rows={compact ? 2 : 3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || current === "admis"}
          onClick={() => void submit("admis")}
        >
          {t("school.approve")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy || current === "respins"}
          onClick={() => void submit("respins")}
        >
          {t("school.reject")}
        </Button>
        {current !== "nediscutat" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void submit("nediscutat")}
          >
            {t("class.reset")}
          </Button>
        ) : null}
      </div>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
