"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Species } from "@/lib/types";
import { SPECIES_CATALOG, speciesDisplayLabel } from "@/lib/species";
import { useI18n } from "@/lib/i18n/use-i18n";

interface Props {
  species: Species | "";
  speciesOther: string;
  onSpeciesChange: (s: Species | "") => void;
  onOtherChange: (v: string) => void;
  error?: string;
  otherError?: string;
}

/** DATA-04 / DATA-11: shows human label, not internal code. */
export function SpeciesSelect({
  species,
  speciesOther,
  onSpeciesChange,
  onOtherChange,
  error,
  otherError,
}: Props) {
  const { t, locale } = useI18n();
  const loc = locale === "en" ? "en" : "ro";

  return (
    <div data-field="species" className="space-y-2">
      <Label>
        {t("obs.species")} <span className="text-destructive">*</span>
      </Label>
      <Select
        value={species || undefined}
        onValueChange={(v) => onSpeciesChange((v ?? "") as Species)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("obs.selectSpecies")}>
            {species
              ? speciesDisplayLabel(species, loc, speciesOther)
              : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SPECIES_CATALOG.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {speciesDisplayLabel(s.id, loc)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {species === "alta" ? (
        <div data-field="speciesOther" className="space-y-1 pt-1">
          <Label htmlFor="speciesOther">
            {t("sp.otherRequired")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="speciesOther"
            value={speciesOther}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder={t("sp.otherPlaceholder")}
          />
          {otherError ? (
            <p className="text-sm text-destructive">{otherError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
