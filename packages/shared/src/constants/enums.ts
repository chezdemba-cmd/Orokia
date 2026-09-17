export const ROLES = [
  "DIRECTION",
  "CENSEUR",
  "SECRETAIRE",
  "ENSEIGNANT",
  "PARENT",
  "ELEVE",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLES_REQUIRING_2FA: readonly Role[] = ["DIRECTION", "CENSEUR", "SECRETAIRE"];

export const NIVEAUX = ["PRIMAIRE", "COLLEGE", "LYCEE"] as const;
export type Niveau = (typeof NIVEAUX)[number];

export const TERM_STATUSES = ["OUVERTE", "CLOTUREE"] as const;
export type TermStatus = (typeof TERM_STATUSES)[number];

export const ATTENDANCE_TYPES = ["PRESENT", "ABSENT", "RETARD", "EXCUSE"] as const;
export type AttendanceType = (typeof ATTENDANCE_TYPES)[number];

export const STATUT_EMPLOI = ["PERMANENT", "VACATAIRE"] as const;
export type StatutEmploi = (typeof STATUT_EMPLOI)[number];

export const ANNONCE_STATUTS = ["BROUILLON", "PROGRAMMEE", "PUBLIEE"] as const;
export type AnnonceStatut = (typeof ANNONCE_STATUTS)[number];

export const SEANCE_ETATS = ["OK", "ANNULE", "DEPLACE", "CONFLIT"] as const;
export type SeanceEtat = (typeof SEANCE_ETATS)[number];

export const ACCOUNT_ETATS = ["ACTIF", "SUSPENDU"] as const;
export type AccountEtat = (typeof ACCOUNT_ETATS)[number];

export const OTP_CHANNELS = ["SMS", "VOICE"] as const;
export type OtpChannel = (typeof OTP_CHANNELS)[number];

export const CONVERSATION_TYPES = ["DIRECT", "BROADCAST"] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

/** Barème (max grade scale) is a property of the class's niveau — never entered manually. */
export function getBareme(niveau: Niveau): 10 | 20 {
  return niveau === "PRIMAIRE" ? 10 : 20;
}
