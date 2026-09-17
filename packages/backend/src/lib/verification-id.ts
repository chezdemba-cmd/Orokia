import { randomBytes } from "node:crypto";

function randomSuffix(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

/** Ex. BUL-2026-T2-AD2312-7K4Q — identifiant unique vérifiable sur un bulletin imprimé. */
export function generateReportCardVerificationId(anneeScolaire: string, termeNumero: number, matricule: string): string {
  const annee = anneeScolaire.split("-")[1] ?? anneeScolaire;
  const matriculeCode = matricule.replace(/-/g, "");
  return `BUL-${annee}-T${termeNumero}-${matriculeCode}-${randomSuffix(4)}`;
}

/** Ex. REC-2026-K7QZ — identifiant unique d'un reçu de paiement. */
export function generateReceiptVerificationId(): string {
  const annee = new Date().getFullYear();
  return `REC-${annee}-${randomSuffix(4)}`;
}

/** Ex. PAIE-2026-01-ENS014-3M9P — identifiant unique d'un bulletin de paie. */
export function generatePayslipVerificationId(periode: string, matriculeEmploye: string): string {
  return `PAIE-${periode}-${matriculeEmploye.replace(/-/g, "")}-${randomSuffix(4)}`;
}
