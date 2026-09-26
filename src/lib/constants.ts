import type {
  DisturbanceType,
  PhenologyStage,
  Species,
  UserRole,
  ObservationModule,
  ObservationStatus,
} from "./types";

export const APP_NAME = "CALI";
export const APP_FULL_NAME = "CALI-LAB";
export const GDPR_VERSION = "2026.1";
export const PARK_CENTER = { lat: 47.125, lng: 25.175 };

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  ranger: "Ranger",
  rezident: "Rezident",
  turist: "Turist",
  elev: "Elev",
};

export const MODULE_LABELS: Record<ObservationModule, string> = {
  fenologie: "Fenologie",
  perturbari: "Perturbări",
  sol: "Sol",
};

export const MODULE_COLORS: Record<ObservationModule, string> = {
  fenologie: "#2d6a4f",
  perturbari: "#9c4221",
  sol: "#6b5b3e",
};

export const STATUS_LABELS: Record<ObservationStatus, string> = {
  in_asteptare: "În așteptare",
  aprobat: "Aprobat",
  respins: "Respins",
  clarificare: "Clarificare",
};

/** Stages 1–4 only; crown health is separate (DATA-03). */
export const PHENOLOGY_STAGES: Record<
  PhenologyStage,
  { label: string; color: string }
> = {
  1: { label: "Dormanță", color: "#64748b" },
  2: { label: "Activare", color: "#84cc16" },
  3: { label: "Foliație", color: "#22c55e" },
  4: { label: "Maturitate", color: "#166534" },
};

export const CROWN_CONDITIONS = [
  "sanatoasa",
  "decolorare_usoara",
  "decolorare_puternica",
  "uscare",
] as const;

export const DISTURBANCE_LABELS: Record<DisturbanceType, string> = {
  atac_insecte: "Atac de insecte",
  doboratura_vant: "Doborâtură de vânt",
  uscare: "Uscare",
  rupturi_zapada: "Rupturi de zăpadă",
  ciuperci: "Ciuperci",
  vatamari_vanat: "Vătămări de vânat",
  incendiu: "Incendiu",
  alta: "Altele",
};

/** Fallback RO labels — prefer speciesDisplayLabel() / i18n. */
export const SPECIES_LABELS: Record<Species, string> = {
  picea_abies: "Molid (Picea abies)",
  abies_alba: "Brad (Abies alba)",
  fagus_sylvatica: "Fag (Fagus sylvatica)",
  pinus_sylvestris: "Pin silvestru (Pinus sylvestris)",
  pinus_cembra: "Zâmbru (Pinus cembra)",
  pinus_mugo: "Jneapăn (Pinus mugo)",
  larix_decidua: "Larice (Larix decidua)",
  acer_pseudoplatanus: "Paltin (Acer pseudoplatanus)",
  sorbus_aucuparia: "Scoruș (Sorbus aucuparia)",
  betula_pendula: "Mesteacăn (Betula pendula)",
  alnus_viridis: "Anin verde (Alnus viridis)",
  alta: "Altă specie",
};

export const SEVERITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Foarte ușoară — semne minime",
  2: "Ușoară — afectare localizată",
  3: "Moderată — impact vizibil",
  4: "Severă — afectare extinsă",
  5: "Critică — arbore compromis",
};

export const DEMO_ACCOUNTS = [
  {
    email: "admin@cali-lab.ro",
    password: "Admin123!",
    role: "admin" as const,
  },
  {
    email: "ranger@cali-lab.ro",
    password: "Ranger123!",
    role: "ranger" as const,
  },
  {
    email: "turist@cali-lab.ro",
    password: "Turist123!",
    role: "turist" as const,
  },
  {
    email: "elev@cali-lab.ro",
    password: "Elev1234!",
    role: "elev" as const,
  },
];
