export type UserRole =
  | "admin"
  | "ranger"
  | "profesor"
  | "rezident"
  | "turist"
  | "elev";
export type UserStatus = "activ" | "inactiv";

/** ADM-08 audit actions. */
export type AuditAction =
  | "login_admin"
  | "validate"
  | "reopen"
  | "delete_observation"
  | "delete_photo"
  | "correct_observation"
  | "export"
  | "create_user"
  | "update_user"
  | "suspend_user"
  | "reactivate_user"
  | "reset_password"
  | "delete_user"
  | "password_change"
  | "account_delete_request"
  | "create_activity"
  | "update_activity"
  | "delete_activity"
  | "join_activity";

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  objectType: string;
  objectId: string;
  detail?: string;
}

/** ROL-06 field activity (Școli). */
export interface FieldActivity {
  id: string;
  title: string;
  date: string;
  zoneName: string;
  zoneLat: number;
  zoneLng: number;
  zoneRadiusM: number;
  treeIds: string[];
  schoolName?: string;
  /** Short code students use to join (e.g. K7M2PQ). */
  joinCode: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: "validated" | "rejected" | "clarification" | "info";
  title: string;
  body: string;
  observationId?: string;
  createdAt: string;
  readAt?: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
}
export type ObservationModule = "fenologie" | "perturbari" | "sol";
export type ObservationStatus =
  | "in_asteptare"
  | "aprobat"
  | "respins"
  | "clarificare";

/** Ranger/admin validation actions (ROL-02 / ROL-03). */
export type ValidationDecisionKind =
  | "aprobat"
  | "respins"
  | "aprobat_cu_corectii"
  | "cere_clarificari"
  | "reopen"
  | "clarificare_raspuns";

/** Field snapshot before corrections (kept for FAIR export). */
export interface ObservationFieldSnapshot {
  species?: Species;
  speciesOther?: string;
  stage?: PhenologyStage;
  crownCondition?: CrownCondition;
  disturbanceTypes?: DisturbanceType[];
  severity?: 1 | 2 | 3 | 4 | 5;
  affectedAreaSqm?: number;
  insectType?: string;
  details?: string;
}

export interface ValidationDecision {
  id: string;
  at: string;
  byId: string;
  byName: string;
  kind: ValidationDecisionKind;
  comment: string;
  previousStatus: ObservationStatus;
  nextStatus: ObservationStatus;
  /** Values applied as corrections (if any). */
  corrections?: ObservationFieldSnapshot;
  /** Original values at decision time (export / audit). */
  originalSnapshot?: ObservationFieldSnapshot;
}
/** Local persistence vs server upload */
export type SyncStatus = "pending" | "synced" | "error";

/** Phenological stage only (1–4). Legacy stage 5 migrated to crownCondition. */
export type PhenologyStage = 1 | 2 | 3 | 4;

/** Separate from phenological stage (DATA-03). */
export type CrownCondition =
  | "sanatoasa"
  | "decolorare_usoara"
  | "decolorare_puternica"
  | "uscare";

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
  | "pinus_cembra"
  | "pinus_mugo"
  | "larix_decidua"
  | "acer_pseudoplatanus"
  | "sorbus_aucuparia"
  | "betula_pendula"
  | "alnus_viridis"
  | "alta";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  /** GPS accuracy in metres (kept separate from rounded coords — DATA-06). */
  accuracy: number | null;
  altitude: number | null;
  capturedAt: string;
}

/** EXIF / capture metadata for one photo (DATA-08). */
export interface PhotoMeta {
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
}

export interface ObservationEdit {
  at: string;
  byId: string;
  byName: string;
  summary: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  /** Server-only password hash; never sent to clients. */
  password: string;
  isAdult: boolean;
  parentalConsent?: boolean;
  gdprAcceptedAt?: string;
  gdprVersion?: string;
  registeredAt: string;
  lastLoginAt?: string;
  /**
   * Ranger-only: admin can grant user-registration management
   * (create/edit/suspend users).
   */
  canManageRegistrations?: boolean;
  /**
   * Ranger-only: admin can grant full school/lesson powers
   * (same as profesor: activities, lesson hub, join codes).
   */
  canTeachSchool?: boolean;
}

/** Safe user shape for API / client state (no password). */
export type PublicUser = Omit<User, "password">;

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
  /** Parallel to photos[] — EXIF date/coords when available. */
  photoMeta?: PhotoMeta[];
  location: GeoLocation;
  /** True when user moved the map pin (DATA-13). */
  locationAdjusted?: boolean;
  createdAt: string;
  validatedAt?: string;
  validatorId?: string;
  validatorName?: string;
  validationComment?: string;
  /** Full audit trail of validation decisions (ROL-02). */
  validationHistory?: ValidationDecision[];
  /** First-submitted scientific fields (preserved when corrected). */
  originalFields?: ObservationFieldSnapshot;
  /** Open clarification question from ranger (ROL-03). */
  clarificationQuestion?: string;
  clarificationReply?: string;
  /** Legacy flag; prefer sentinelTreeId when set. */
  isSentinelTree?: boolean;
  /** Link to permanent sentinel tree (DATA-02). */
  sentinelTreeId?: string;
  /** ROL-06: linked school field activity. */
  activityId?: string;
  species?: Species;
  /** Free text when species === "alta". */
  speciesOther?: string;
  editHistory?: ObservationEdit[];
  /** pending until successfully uploaded when online */
  syncStatus?: SyncStatus;
  syncError?: string;
  syncedAt?: string;
}

export interface FenologieObservation extends ObservationBase {
  module: "fenologie";
  stage: PhenologyStage;
  crownCondition: CrownCondition;
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
  /** DATA-05 protocol plot size. */
  plotSize: "1x1m";
  /** Optional AI demo suggestion (human values above remain authoritative). */
  aiCoverSuggestion?: {
    mossPct: number;
    litterPct: number;
    plantsPct: number;
    barePct: number;
    mode: "offline" | "online";
    model: string;
    at: string;
  };
}

export type Observation =
  | FenologieObservation
  | PerturbariObservation
  | SolObservation;

/** Permanent sentinel tree (DATA-02 / ROL-04). */
export interface SentinelTree {
  id: string;
  code: string;
  species: Species;
  speciesOther?: string;
  latitude: number;
  longitude: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  notes?: string;
}

export interface AppSettings {
  passwordResetMinutesUser: number;
  passwordResetMinutesAdmin: number;
  smtpEncryption: "tls" | "ssl";
  gpsAccuracyWarningMeters: number;
  /** Activity the student/teacher is currently working in (join code flow). */
  activeActivityId?: string;
}
