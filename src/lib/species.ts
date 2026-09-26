import type { Species } from "@/lib/types";

export type SpeciesGroup = "rasinoase" | "foioase" | "alta";

export interface SpeciesDef {
  id: Species;
  scientific: string;
  labelRo: string;
  labelEn: string;
  group: SpeciesGroup;
  /** GBIF taxonKey — fill when verified. */
  gbifTaxonKey: number | null; // TODO(DATA-04): set verified GBIF taxonKeys
}

/**
 * CALI species nomenclature (DATA-04).
 * Display: "Label (Scientific)" via speciesDisplayLabel().
 */
export const SPECIES_CATALOG: SpeciesDef[] = [
  {
    id: "picea_abies",
    scientific: "Picea abies",
    labelRo: "Molid",
    labelEn: "Norway spruce",
    group: "rasinoase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "abies_alba",
    scientific: "Abies alba",
    labelRo: "Brad",
    labelEn: "Silver fir",
    group: "rasinoase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "pinus_sylvestris",
    scientific: "Pinus sylvestris",
    labelRo: "Pin silvestru",
    labelEn: "Scots pine",
    group: "rasinoase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "pinus_cembra",
    scientific: "Pinus cembra",
    labelRo: "Zâmbru",
    labelEn: "Swiss stone pine",
    group: "rasinoase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "pinus_mugo",
    scientific: "Pinus mugo",
    labelRo: "Jneapăn",
    labelEn: "Mountain pine",
    group: "rasinoase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "larix_decidua",
    scientific: "Larix decidua",
    labelRo: "Larice",
    labelEn: "European larch",
    group: "rasinoase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "fagus_sylvatica",
    scientific: "Fagus sylvatica",
    labelRo: "Fag",
    labelEn: "European beech",
    group: "foioase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "acer_pseudoplatanus",
    scientific: "Acer pseudoplatanus",
    labelRo: "Paltin",
    labelEn: "Sycamore maple",
    group: "foioase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "sorbus_aucuparia",
    scientific: "Sorbus aucuparia",
    labelRo: "Scoruș",
    labelEn: "Rowan",
    group: "foioase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "betula_pendula",
    scientific: "Betula pendula",
    labelRo: "Mesteacăn",
    labelEn: "Silver birch",
    group: "foioase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "alnus_viridis",
    scientific: "Alnus viridis",
    labelRo: "Anin verde",
    labelEn: "Green alder",
    group: "foioase",
    gbifTaxonKey: null, // TODO GBIF
  },
  {
    id: "alta",
    scientific: "",
    labelRo: "Altă specie",
    labelEn: "Other species",
    group: "alta",
    gbifTaxonKey: null,
  },
];

export const SPECIES_IDS: Species[] = SPECIES_CATALOG.map((s) => s.id);

export function getSpeciesDef(id: Species | string | undefined): SpeciesDef | undefined {
  return SPECIES_CATALOG.find((s) => s.id === id);
}

export function isConifer(species: Species | string | undefined): boolean {
  return getSpeciesDef(species)?.group === "rasinoase";
}

export function speciesDisplayLabel(
  id: Species | string | undefined,
  locale: "ro" | "en",
  otherText?: string
): string {
  const def = getSpeciesDef(id);
  if (!def) return String(id ?? "");
  if (def.id === "alta") {
    return otherText?.trim()
      ? otherText.trim()
      : locale === "en"
        ? def.labelEn
        : def.labelRo;
  }
  const common = locale === "en" ? def.labelEn : def.labelRo;
  return `${common} (${def.scientific})`;
}
