import { round2 } from "@orokia/shared";

export type Nullable<T> = T | null;

/**
 * Moyenne de matière = (devoir1 + devoir2 + composition×2) / 4.
 * Si une seule des trois valeurs manque, la moyenne reste null (jamais 0)
 * — l'élève est alors exclu du classement tant que la note n'est pas complète.
 */
export function computeSubjectAverage(
  devoir1: Nullable<number>,
  devoir2: Nullable<number>,
  composition: Nullable<number>,
): number | null {
  if (devoir1 === null || devoir2 === null || composition === null) return null;
  return round2((devoir1 + devoir2 + composition * 2) / 4);
}

export interface SubjectAverageEntry {
  average: number | null;
  coefficient: number;
}

/**
 * Moyenne générale = Σ(moyenne × coefficient) / Σ(coefficients).
 * Retourne null si une seule matière de l'élève a une moyenne incomplète —
 * l'élève est alors exclu du classement (voir lib/ranking.ts).
 */
export function computeGeneralAverage(subjectAverages: SubjectAverageEntry[]): number | null {
  if (subjectAverages.length === 0) return null;
  if (subjectAverages.some((s) => s.average === null)) return null;

  let weightedSum = 0;
  let coefficientSum = 0;
  for (const { average, coefficient } of subjectAverages) {
    weightedSum += (average as number) * coefficient;
    coefficientSum += coefficient;
  }
  if (coefficientSum === 0) return null;
  return round2(weightedSum / coefficientSum);
}
