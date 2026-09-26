"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Crosshair, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GeoLocation } from "@/lib/types";
import { captureGeolocation, formatCoord, formatDateTime, mockLocationNearPark } from "@/lib/format";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";

interface Props {
  value: GeoLocation | null;
  onChange: (loc: GeoLocation | null) => void;
  onError?: (msg: string | null) => void;
}

export function GeoCapture({ value, onChange, onError }: Props) {
  const { t } = useI18n();
  const warningMeters = useCaliStore((s) => s.settings.gpsAccuracyWarningMeters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = async () => {
    setLoading(true);
    setError(null);
    onError?.(null);
    try {
      const loc = await captureGeolocation();
      onChange(loc);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : t("geo.locateFailed");
      setError(msg);
      onError?.(msg);
      onChange(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useDemo = () => {
    const loc = mockLocationNearPark();
    onChange(loc);
    setError(null);
    onError?.(null);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/80 bg-card/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Crosshair className="size-4 text-moss" />
          {t("geo.title")}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void locate()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("geo.retry")}
        </Button>
      </div>

      {loading && !value ? (
        <p className="text-sm text-muted-foreground">{t("geo.locating")}</p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("geo.unavailable")}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error}</p>
            <Button type="button" size="sm" variant="secondary" onClick={useDemo}>
              {t("geo.demo")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {value ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">{t("geo.lat")}</dt>
            <dd className="font-medium">{formatCoord(value.latitude)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("geo.lng")}</dt>
            <dd className="font-medium">{formatCoord(value.longitude)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("geo.accuracy")}</dt>
            <dd className="font-medium">
              {value.accuracy != null ? `${value.accuracy} m` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("geo.altitude")}</dt>
            <dd className="font-medium">
              {value.altitude != null ? `${value.altitude} m` : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">{t("geo.capturedAt")}</dt>
            <dd className="font-medium">{formatDateTime(value.capturedAt)}</dd>
          </div>
        </dl>
      ) : null}

      {value?.accuracy != null && value.accuracy > warningMeters ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("geo.lowAccuracy")}</AlertTitle>
          <AlertDescription>
            {t("geo.lowAccuracyMsg", {
              accuracy: value.accuracy,
              threshold: warningMeters,
            })}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
