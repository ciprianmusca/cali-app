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
};

export const PHENOLOGY_STAGES: Record<
  PhenologyStage,
  { label: string; description: string; color: string }
> = {
  1: {
    label: "Dormanță",
    description: "Muguri închiși, dormanți (iarnă – primăvară timpurie)",
    color: "#64748b",
  },
  2: {
    label: "Activare",
    description: "Muguri umflați, încep să se deschidă (primăvară)",
    color: "#84cc16",
  },
  3: {
    label: "Foliație",
    description: "Ace noi vizibile, verzi-deschis (primăvară târzie)",
    color: "#22c55e",
  },
  4: {
    label: "Maturitate",
    description: "Coroană complet dezvoltată, verde-închis (vară)",
    color: "#166534",
  },
  5: {
    label: "Stres",
    description: "Decolorare/îngălbenire vizibilă (toamnă – iarnă timpurie)",
    color: "#ca8a04",
  },
};

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

export const SPECIES_LABELS: Record<Species, string> = {
  picea_abies: "Molid (Picea abies)",
  abies_alba: "Brad (Abies alba)",
  fagus_sylvatica: "Fag (Fagus sylvatica)",
  pinus_sylvestris: "Pin silvestru (Pinus sylvestris)",
  larix_decidua: "Larice (Larix decidua)",
  acer_pseudoplatanus: "Paltin (Acer pseudoplatanus)",
  sorbus_aucuparia: "Scoruș (Sorbus aucuparia)",
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
