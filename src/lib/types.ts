export type UserRole = "admin" | "ranger" | "rezident" | "turist" | "elev";
export type UserStatus = "activ" | "inactiv";
export type ObservationModule = "fenologie" | "perturbari" | "sol";
export type ObservationStatus = "in_asteptare" | "aprobat" | "respins";
/** Local persistence vs server upload */
export type SyncStatus = "pending" | "synced" | "error";

export type PhenologyStage = 1 | 2 | 3 | 4 | 5;

export type DisturbanceType =
  | "atac_insecte"
  | "doboratura_vant"
  | "uscare"
  | "rupturi_zapada"
  | "ciuperci"
  | "vatamari_vanat"
  | "incendiu"
  | "alta";

export type Species =
  | "picea_abies"
  | "abies_alba"
  | "fagus_sylvatica"
  | "pinus_sylvestris"
  | "larix_decidua"
  | "acer_pseudoplatanus"
  | "sorbus_aucuparia"
  | "alta";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  capturedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  password: string;
  isAdult: boolean;
  parentalConsent?: boolean;
  gdprAcceptedAt?: string;
  gdprVersion?: string;
  registeredAt: string;
  lastLoginAt?: string;
}

export interface ObservationBase {
  id: string;
  code: string;
  module: ObservationModule;
  status: ObservationStatus;
  authorId: string;
  authorRole: UserRole;
  authorName: string;
  details?: string;
  photos: string[];
  location: GeoLocation;
  createdAt: string;
  validatedAt?: string;
  validatorId?: string;
  validatorName?: string;
  validationComment?: string;
  isSentinelTree?: boolean;
  species?: Species;
  /** pending until successfully uploaded when online */
  syncStatus?: SyncStatus;
  syncError?: string;
  syncedAt?: string;
}

export interface FenologieObservation extends ObservationBase {
  module: "fenologie";
  stage: PhenologyStage;
  species: Species;
}

export interface PerturbariObservation extends ObservationBase {
  module: "perturbari";
  disturbanceTypes: DisturbanceType[];
  insectType?: string;
  severity: 1 | 2 | 3 | 4 | 5;
  affectedAreaSqm: number;
  species: Species;
}

export interface SolObservation extends ObservationBase {
  module: "sol";
  mossPct: number;
  litterPct: number;
  barePct: number;
  plantsPct: number;
  seedlingsPresent: boolean;
}

export type Observation =
  | FenologieObservation
  | PerturbariObservation
  | SolObservation;

export interface AppSettings {
  passwordResetMinutesUser: number;
  passwordResetMinutesAdmin: number;
  smtpEncryption: "tls" | "ssl";
  gpsAccuracyWarningMeters: number;
}
