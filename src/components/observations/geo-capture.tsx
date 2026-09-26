"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Crosshair, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GeoLocation } from "@/lib/types";
import { captureGeolocation, formatCoord, formatDateTime, mockLocationNearPark } from "@/lib/format";
import { useCaliStore } from "@/lib/store";

interface Props {
  value: GeoLocation | null;
  onChange: (loc: GeoLocation | null) => void;
  onError?: (msg: string | null) => void;
}

export function GeoCapture({ value, onChange, onError }: Props) {
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
          : "Nu s-a putut determina geolocația.";
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
          Geolocație
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
          Reîncercați
        </Button>
      </div>

      {loading && !value ? (
        <p className="text-sm text-muted-foreground">Se determină geolocația…</p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Locație indisponibilă</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error}</p>
            <Button type="button" size="sm" variant="secondary" onClick={useDemo}>
              Folosiți poziție demonstrativă (Călimani)
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {value ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Latitudine</dt>
            <dd className="font-medium">{formatCoord(value.latitude)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Longitudine</dt>
            <dd className="font-medium">{formatCoord(value.longitude)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Precizie</dt>
            <dd className="font-medium">
              {value.accuracy != null ? `${value.accuracy} m` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Altitudine</dt>
            <dd className="font-medium">
              {value.altitude != null ? `${value.altitude} m` : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Ora capturii</dt>
            <dd className="font-medium">{formatDateTime(value.capturedAt)}</dd>
          </div>
        </dl>
      ) : null}

      {value?.accuracy != null && value.accuracy > warningMeters ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Precizie scăzută</AlertTitle>
          <AlertDescription>
            Precizia GPS ({value.accuracy} m) depășește pragul de {warningMeters}{" "}
            m. Preferabil semnal GPS, nu doar rețea.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
