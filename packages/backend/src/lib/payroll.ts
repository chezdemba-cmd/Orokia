import { round2 } from "@orokia/shared";

export const INPS_RATE = 0.036; // part salariale — cotisation retraite (INPS)

/**
 * Barème simplifié et illustratif de l'impôt sur les traitements et salaires
 * (ITS). Les seuils/taux ci-dessous ne sont PAS une source légale — ils
 * doivent être remplacés par le barème officiel validé par un comptable
 * avant tout usage réel. Le mécanisme de calcul progressif, lui, est correct.
 */
const ITS_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 50_000, rate: 0 },
  { upTo: 150_000, rate: 0.05 },
  { upTo: 300_000, rate: 0.12 },
  { upTo: Infinity, rate: 0.2 },
];

export function computeInps(brut: number): number {
  return round2(brut * INPS_RATE);
}

export function computeIts(brut: number): number {
  let remaining = brut;
  let previousThreshold = 0;
  let total = 0;

  for (const bracket of ITS_BRACKETS) {
    if (remaining <= 0) break;
    const bracketSize = bracket.upTo - previousThreshold;
    const taxableInBracket = Math.min(remaining, bracketSize);
    total += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    previousThreshold = bracket.upTo;
  }

  return round2(total);
}

export interface PayrollComputation {
  brut: number;
  inps: number;
  its: number;
  retenues: number;
  net: number;
}

export function computePayroll(brut: number): PayrollComputation {
  const inps = computeInps(brut);
  const its = computeIts(brut);
  const retenues = round2(inps + its);
  const net = round2(brut - retenues);
  return { brut, inps, its, retenues, net };
}

export function computeGrossPermanent(salaireBase: number, indemniteTransport: number, primeResponsabilite: number): number {
  return round2(salaireBase + indemniteTransport + primeResponsabilite);
}

export function computeGrossVacataire(tauxHoraire: number, heures: number): number {
  return round2(tauxHoraire * heures);
}
